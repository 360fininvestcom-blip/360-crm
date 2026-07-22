import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { injectTracking } from '@/lib/email-tracking';
import { Prisma } from '@prisma/client';

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
        let accounts: any[] = [];
        if (accountId) {
            accounts = await prisma.$queryRaw`
                SELECT * FROM smtp_configs
                WHERE organization_id = CAST(${organizationId} AS UUID)
                  AND id = CAST(${accountId} AS UUID)
                LIMIT 1
            `;
        } else {
            accounts = await prisma.$queryRaw`
                SELECT * FROM smtp_configs
                WHERE organization_id = CAST(${organizationId} AS UUID)
                  AND is_default = true
                LIMIT 1
            `;
        }

        const account = accounts[0];

        if (!account) {
            throw new Error(`SMTP account not found for organization ${organizationId}`);
        }

        // 2. Resolve Template if needed
        let finalSubject = subject || 'No Subject';
        let finalBody = bodyHtml || '';

        if (templateId) {
            const templates: any[] = await prisma.$queryRaw`
                SELECT * FROM email_templates
                WHERE id = CAST(${templateId} AS UUID)
                LIMIT 1
            `;
            const template = templates[0];

            if (!template) {
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
        const receivedAt = new Date().toISOString();
        const emails: any[] = await prisma.$queryRaw`
            INSERT INTO emails (account_id, organization_id, from_addr, to_addr, subject, body_html, folder, is_read, received_at)
            VALUES (
                CAST(${account.id} AS UUID),
                CAST(${organizationId} AS UUID),
                ${account.email_addr},
                ${to},
                ${finalSubject},
                ${finalBody},
                'sent',
                true,
                CAST(${receivedAt} AS TIMESTAMPTZ)
            )
            RETURNING id
        `;

        const emailRecord = emails[0];

        // 5. Inject Tracking
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const trackedBody = injectTracking(finalBody, emailRecord.id, baseUrl);

        // Update record with tracked body
        await prisma.$executeRaw`
            UPDATE emails 
            SET body_html = ${trackedBody}
            WHERE id = CAST(${emailRecord.id} AS UUID)
        `;

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
        await prisma.$executeRaw`
            INSERT INTO activities (organization_id, type, title, description, metadata)
            VALUES (
                CAST(${organizationId} AS UUID),
                'email',
                ${`Sent Email: ${finalSubject}`},
                ${`Sent to ${to}`},
                ${Prisma.sql`${{ email_id: emailRecord.id }}::jsonb`}
            )
        `;

        return { success: true, emailId: emailRecord.id };
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Email service failure:', error.message);
        }
        throw error;
    }
}
