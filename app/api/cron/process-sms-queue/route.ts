import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';
import { decrypt } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch up to 10 pending SMS (safe for 1 Message-Per-Second limit over 10s)
    const queueItems: any[] = await prisma.$queryRaw`
        SELECT * FROM sms_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
    `;

    if (!queueItems || queueItems.length === 0) {
        return NextResponse.json({ message: 'No SMS to process' });
    }

    // Mark as processing
    const itemIds = queueItems.map(item => item.id);
    await prisma.$executeRaw`
        UPDATE sms_queue 
        SET status = 'processing' 
        WHERE id IN (${Prisma.join(itemIds.map(id => Prisma.sql`CAST(${id} AS UUID)`))})
    `;

    // Group by organization to fetch Twilio configs efficiently
    const orgIds = [...new Set(queueItems.map(i => i.organization_id))];
    const configs: any[] = await prisma.$queryRaw`
        SELECT * FROM twilio_configs
        WHERE is_active = true
        AND organization_id IN (${Prisma.join(orgIds.map(id => Prisma.sql`CAST(${id} AS UUID)`))})
    `;

    const configMap = new Map();
    configs?.forEach(cfg => {
        try {
            const token = decrypt(cfg.auth_token_encrypted);
            configMap.set(cfg.organization_id, {
                client: twilio(cfg.account_sid, token),
                fromNumber: cfg.from_number
            });
        } catch (err) {
            console.error(`Failed to decrypt Twilio token for org ${cfg.organization_id}`);
        }
    });

    let processedCount = 0;

    for (const item of queueItems) {
        try {
            const twilioSetup = configMap.get(item.organization_id);
            if (!twilioSetup) {
                throw new Error("Active Twilio configuration not found or invalid.");
            }

            // Check if contact unsubscribed (e.g., they replied STOP)
            if (item.contact_id) {
                 const rawContacts: any[] = await prisma.$queryRaw`SELECT unsubscribed FROM contacts WHERE id = CAST(${item.contact_id} AS UUID)`;
                 const rawContact = rawContacts[0];

                 if (rawContact?.unsubscribed) {
                     const now = new Date().toISOString();
                     await prisma.$executeRaw`
                        UPDATE sms_queue
                        SET status = 'failed',
                            error_message = 'Contact is unsubscribed',
                            processed_at = CAST(${now} AS TIMESTAMPTZ)
                        WHERE id = CAST(${item.id} AS UUID)
                     `;
                     continue;
                 }
            }

            // Send via Twilio
            await twilioSetup.client.messages.create({
                body: item.message,
                from: twilioSetup.fromNumber,
                to: item.to_phone
            });

            // Mark completed
            const now = new Date().toISOString();
            await prisma.$executeRaw`
                UPDATE sms_queue
                SET status = 'completed',
                    processed_at = CAST(${now} AS TIMESTAMPTZ)
                WHERE id = CAST(${item.id} AS UUID)
            `;

            processedCount++;

            // Wait 1 second (Twilio standard limit is 1 MPS per Long Code)
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
            console.error(`Failed to send queued SMS ${item.id}:`, err);
            const now = new Date().toISOString();
            const attempts = (item.attempts || 0) + 1;
            await prisma.$executeRaw`
                UPDATE sms_queue
                SET status = 'failed',
                    error_message = ${err.message || 'Unknown error'},
                    attempts = ${attempts},
                    processed_at = CAST(${now} AS TIMESTAMPTZ)
                WHERE id = CAST(${item.id} AS UUID)
            `;
        }
    }

    return NextResponse.json({ message: `Processed ${processedCount} SMS successfully` });
}
