import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    // Optional: Protect cron route with a secret token
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch up to 20 pending emails (safe batch size for Vercel functions)
    const queueItems: any[] = await prisma.$queryRaw`
        SELECT * FROM email_queue
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 20
    `;

    if (!queueItems || queueItems.length === 0) {
        return NextResponse.json({ message: 'No emails to process' });
    }

    // 2. Mark as processing to avoid race conditions
    const itemIds = queueItems.map(item => item.id);
    await prisma.$executeRaw`
        UPDATE email_queue 
        SET status = 'processing' 
        WHERE id IN (${Prisma.join(itemIds.map(id => Prisma.sql`CAST(${id} AS UUID)`))})
    `;

    let processedCount = 0;

    // 3. Process emails sequentially with a delay (Slow-Drip Queue)
    for (const item of queueItems) {
        try {
            // Re-check contact status right before sending
            if (item.contact_id) {
                 const contact = await prisma.contact.findUnique({
                     where: { id: item.contact_id },
                     select: { customFields: true } // Assuming unsubscribed and bounced might be in customFields? In supabase they were specific columns 'unsubscribed', 'bounced'. Wait, we should use raw query if they are not in schema.
                 });
                 // Actually they might not be in Prisma schema explicitly. Let's do a raw query for safety to match supabase schema since we used it before.
                 const rawContacts: any[] = await prisma.$queryRaw`SELECT unsubscribed, bounced FROM contacts WHERE id = CAST(${item.contact_id} AS UUID)`;
                 const rawContact = rawContacts[0];

                 if (rawContact && (rawContact.unsubscribed || rawContact.bounced)) {
                     const now = new Date().toISOString();
                     const errorMessage = rawContact.unsubscribed ? 'Contact unsubscribed' : 'Contact previously bounced';
                     await prisma.$executeRaw`
                        UPDATE email_queue
                        SET status = 'failed',
                            error_message = ${errorMessage},
                            processed_at = CAST(${now} AS TIMESTAMPTZ)
                        WHERE id = CAST(${item.id} AS UUID)
                     `;
                     continue; // Skip sending
                 }
            }

            // Dispatch via connected SMTP
            await sendEmail({
                to: item.to_email,
                subject: item.subject,
                bodyHtml: item.body_html,
                organizationId: item.organization_id
            });

            // Mark completed
            const now = new Date().toISOString();
            await prisma.$executeRaw`
                UPDATE email_queue
                SET status = 'completed',
                    processed_at = CAST(${now} AS TIMESTAMPTZ)
                WHERE id = CAST(${item.id} AS UUID)
            `;

            processedCount++;

            // Wait 1 second between sends to respect SMTP rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
            console.error(`Failed to send queued email ${item.id}:`, err);
            const now = new Date().toISOString();
            const attempts = (item.attempts || 0) + 1;
            await prisma.$executeRaw`
                UPDATE email_queue
                SET status = 'failed',
                    error_message = ${err.message || 'Unknown error'},
                    attempts = ${attempts},
                    processed_at = CAST(${now} AS TIMESTAMPTZ)
                WHERE id = CAST(${item.id} AS UUID)
            `;
        }
    }

    return NextResponse.json({ message: `Processed ${processedCount} emails successfully` });
}
