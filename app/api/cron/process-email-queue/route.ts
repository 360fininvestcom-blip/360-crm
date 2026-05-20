import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email-service';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(request: Request) {
    // Optional: Protect cron route with a secret token
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch up to 20 pending emails (safe batch size for Vercel functions)
    const { data: queueItems, error: fetchError } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);

    if (fetchError) {
        console.error('Error fetching email queue:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
        return NextResponse.json({ message: 'No emails to process' });
    }

    // 2. Mark as processing to avoid race conditions
    const itemIds = queueItems.map(item => item.id);
    await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .in('id', itemIds);

    let processedCount = 0;

    // 3. Process emails sequentially with a delay (Slow-Drip Queue)
    for (const item of queueItems) {
        try {
            // Re-check contact status right before sending
            if (item.contact_id) {
                 const { data: contact } = await supabase
                     .from('contacts')
                     .select('unsubscribed, bounced')
                     .eq('id', item.contact_id)
                     .single();

                 if (contact?.unsubscribed || contact?.bounced) {
                     await supabase.from('email_queue').update({
                         status: 'failed',
                         error_message: contact.unsubscribed ? 'Contact unsubscribed' : 'Contact previously bounced',
                         processed_at: new Date().toISOString()
                     }).eq('id', item.id);
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
            await supabase.from('email_queue').update({
                status: 'completed',
                processed_at: new Date().toISOString()
            }).eq('id', item.id);

            processedCount++;

            // Wait 1 second between sends to respect SMTP rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
            console.error(`Failed to send queued email ${item.id}:`, err);
            await supabase.from('email_queue').update({
                status: 'failed',
                error_message: err.message || 'Unknown error',
                attempts: item.attempts + 1,
                processed_at: new Date().toISOString()
            }).eq('id', item.id);
        }
    }

    return NextResponse.json({ message: `Processed ${processedCount} emails successfully` });
}
