import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { injectTracking } from '@/lib/email-tracking';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export interface SendEmailParams {
    to: string;
    subject?: string;
    bodyHtml?: string;
    templateId?: string;
    organizationId: string;
    variables?: Record<string, string>;
    accountId?: string;
}

export async function sendEmail({
    to,
    subject,
    bodyHtml,
    templateId,
    organizationId,
    variables = {},
    accountId
}: SendEmailParams) {
    try {
        // 1. Fetch SMTP Config
        let smtpQuery = getSupabaseAdmin()
            .from('smtp_configs')
            .select('*')
            .eq('organization_id', organizationId);

        if (accountId) {
            smtpQuery = smtpQuery.eq('id', accountId);
        } else {
            smtpQuery = smtpQuery.eq('is_default', true);
        }

        const { data: account, error: accountError } = await smtpQuery.single();

        if (accountError || !account) {
            throw new Error(`SMTP account not found for organization ${organizationId}`);
        }

        // 2. Resolve Template if needed
        let finalSubject = subject || 'No Subject';
        let finalBody = bodyHtml || '';

        if (templateId) {
            const { data: template, error: templateError } = await getSupabaseAdmin()
                .from('email_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (templateError || !template) {
                throw new Error(`Template ${templateId} not found`);
            }

            finalSubject = template.subject || finalSubject;
            finalBody = template.body_html || finalBody;

            // Replace variables
            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = new RegExp(`{{${key}}}`, 'g');
                finalSubject = finalSubject.replace(placeholder, value);
                finalBody = finalBody.replace(placeholder, value);
            });
        }

        // 3. Decrypt credentials
        const password = decrypt(account.smtp_pass_encrypted);

        // 4. Pre-log email for tracking ID
        const { data: emailRecord, error: emailError } = await getSupabaseAdmin()
            .from('emails')
            .insert({
                account_id: account.id,
                organization_id: organizationId,
                from_addr: account.email_addr,
                to_addr: to,
                subject: finalSubject,
                body_html: finalBody,
                folder: 'sent',
                is_read: true,
                received_at: new Date().toISOString()
            })
            .select()
            .single();

        if (emailError) throw emailError;

        // 5. Inject Tracking
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const trackedBody = injectTracking(finalBody, emailRecord.id, baseUrl);

        // Update record with tracked body
        await getSupabaseAdmin().from('emails').update({ body_html: trackedBody }).eq('id', emailRecord.id);

        // 6. Generate plain-text fallback and List-Unsubscribe headers
        const listUnsubscribeUrl = `${baseUrl}/api/public/unsubscribe?email=${encodeURIComponent(to)}&org=${organizationId}`;
        
        // Append visual unsubscribe footer
        const unsubscribeFooter = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; font-family: sans-serif;">
                <p>You are receiving this email because you are subscribed to updates. <br>
                <a href="${listUnsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe from this list</a></p>
            </div>
        `;
        const bodyWithFooter = trackedBody + unsubscribeFooter;
        
        const plainTextBody = bodyWithFooter.replace(/<[^>]*>?/gm, '\n').replace(/\n\s*\n/g, '\n').trim();

        const transporter = nodemailer.createTransport({
            host: account.smtp_host,
            port: account.smtp_port,
            secure: account.smtp_port === 465,
            auth: {
                user: account.smtp_user,
                pass: password,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.sendMail({
            from: `"${account.name || account.smtp_user}" <${account.email_addr || account.smtp_user}>`,
            to,
            subject: finalSubject,
            html: bodyWithFooter,
            text: plainTextBody,
            headers: {
                'List-Unsubscribe': `<${listUnsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
        });

        // 7. Log Activity
        await getSupabaseAdmin().from('activities').insert({
            organization_id: organizationId,
            type: 'email',
            title: `Sent Email: ${finalSubject}`,
            description: `Sent to ${to}`,
            metadata: { email_id: emailRecord.id }
        });

        return { success: true, emailId: emailRecord.id };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Email service failure:', error.message);
        }
        throw error;
    }
}
