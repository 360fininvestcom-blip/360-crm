import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import { decrypt } from '@/lib/crypto';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch up to 10 pending SMS (safe for 1 Message-Per-Second limit over 10s)
    const { data: queueItems, error: fetchError } = await supabase
        .from('sms_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

    if (fetchError) {
        console.error('Error fetching sms queue:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
        return NextResponse.json({ message: 'No SMS to process' });
    }

    // Mark as processing
    const itemIds = queueItems.map(item => item.id);
    await supabase.from('sms_queue').update({ status: 'processing' }).in('id', itemIds);

    // Group by organization to fetch Twilio configs efficiently
    const orgIds = [...new Set(queueItems.map(i => i.organization_id))];
    const { data: configs } = await supabase
        .from('twilio_configs')
        .select('*')
        .in('organization_id', orgIds)
        .eq('is_active', true);

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
                 const { data: contact } = await supabase
                     .from('contacts')
                     .select('unsubscribed')
                     .eq('id', item.contact_id)
                     .single();

                 if (contact?.unsubscribed) {
                     await supabase.from('sms_queue').update({
                         status: 'failed',
                         error_message: 'Contact is unsubscribed',
                         processed_at: new Date().toISOString()
                     }).eq('id', item.id);
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
            await supabase.from('sms_queue').update({
                status: 'completed',
                processed_at: new Date().toISOString()
            }).eq('id', item.id);

            processedCount++;

            // Wait 1 second (Twilio standard limit is 1 MPS per Long Code)
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
            console.error(`Failed to send queued SMS ${item.id}:`, err);
            await supabase.from('sms_queue').update({
                status: 'failed',
                error_message: err.message || 'Unknown error',
                attempts: item.attempts + 1,
                processed_at: new Date().toISOString()
            }).eq('id', item.id);
        }
    }

    return NextResponse.json({ message: `Processed ${processedCount} SMS successfully` });
}
