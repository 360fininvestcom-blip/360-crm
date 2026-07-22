import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { injectTracking } from '@/lib/email-tracking';
import type { EmailSequenceStep, SMTPConfig } from '@/types';

// Type definitions for processing
interface UserData {
    id: string;
    email?: string;
}

interface TransporterWithMeta extends nodemailer.Transporter {
    accountInfo?: any;
}

interface EnrollmentUpdate {
    currentStep: number;
    updatedAt: string;
    nextSendAt?: string | null;
    status?: 'completed' | 'active' | 'paused' | 'replied';
}

// Helper to process a single enrollment
async function processEnrollment(
    enrollment: any,
    transporters: Map<string, TransporterWithMeta>,
    user: UserData
): Promise<{ id: string; status: 'success' | 'error'; message?: string }> {
    try {
        const contact = enrollment.contact;
        const sequence = enrollment.sequence;

        if (!contact || !contact.email) {
            return { id: enrollment.id, status: 'error', message: 'Enrollment has no valid contact or email' };
        }

        const steps = sequence.steps as EmailSequenceStep[];
        const currentStepIndex = enrollment.currentStep;

        // Auto-complete if no more steps
        if (currentStepIndex >= steps.length) {
            await prisma.sequenceEnrollment.update({
                where: { id: enrollment.id },
                data: { status: 'completed' }
            });
            return { id: enrollment.id, status: 'success', message: 'Sequence completed (no more steps)' };
        }

        const step = steps[currentStepIndex];

        // 1. Fetch Template
        const template = await prisma.emailTemplate.findUnique({
            where: { id: step.template_id }
        });

        if (!template) {
            return { id: enrollment.id, status: 'error', message: `Template not found (ID: ${step.template_id})` };
        }

        // 2. Get Transporter (reused by SMTP config ID)
        const smtpId = sequence.smtpConfigId; // We need to add smtpConfigId to EmailSequence schema if not there, wait, the schema doesn't have smtpConfigId on EmailSequence directly, wait let's check schema.
        // In Supabase they queried sequence.smtp_config_id. Let's assume it exists in DB. If not, it might be in JSON or something? Wait, in the schema EmailSequence doesn't have smtpConfigId, maybe it was added or maybe it uses organization's SMTP config.
        // Wait, the Supabase schema had sequence:email_sequences(..., smtp_config_id). Let's use organization's SMTP config if missing.
        let targetSmtpId = sequence.smtpConfigId;

        // If targetSmtpId is not available, try to get organization SMTP config
        let account = null;
        if (targetSmtpId) {
            account = await prisma.smtpConfig.findUnique({ where: { id: targetSmtpId } });
        } else {
            account = await prisma.smtpConfig.findUnique({ where: { organizationId: sequence.organizationId } });
            if (account) targetSmtpId = account.id;
        }

        if (!account || !targetSmtpId) {
            return { id: enrollment.id, status: 'error', message: 'No SMTP account found for this sequence.' };
        }

        let transporter = transporters.get(targetSmtpId);

        if (!transporter) {
            if (!account.passwordEncrypted) {
                return { id: enrollment.id, status: 'error', message: 'SMTP Password not configured for this account' };
            }

            const password = decrypt(account.passwordEncrypted);
            transporter = nodemailer.createTransport({
                host: account.host,
                port: account.port,
                secure: account.port === 465,
                auth: { user: account.username, pass: password },
                tls: { rejectUnauthorized: false },
                pool: true,
                maxConnections: 5,
                maxMessages: 100
            });
            // Attach account info for later use (sender address)
            (transporter as TransporterWithMeta).accountInfo = account;
            transporters.set(targetSmtpId, transporter as TransporterWithMeta);
        }

        const currentAccount = (transporter as TransporterWithMeta).accountInfo!;

        // 3. Prepare Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const subject = step.subject_override || template.subject || '(No Subject)';
        let body = template.bodyHtml || template.bodyText || '';

        // Variable replacement
        body = body.replace(/{{first_name}}/g, contact.firstName || '');
        body = body.replace(/{{last_name}}/g, contact.lastName || '');
        body = body.replace(/{{email}}/g, contact.email || '');

        // 4. Create Email Record (assuming Email model exists, though not in schema previously, it might be separate or we use activities)
        // Since Email model wasn't in schema, wait - the schema doesn't have an `Email` model, it has `activities`.
        // Let's create an activity first instead.
        const activity = await prisma.activity.create({
            data: {
                organizationId: currentAccount.organizationId,
                contactId: contact.id,
                type: 'email',
                title: `Sequence Email Sent: ${subject}`,
                description: `Sent as part of "${sequence.name}" (Step ${currentStepIndex + 1})`,
                createdById: user.id
            }
        });

        // 5. Inject Tracking (We will use the activity ID for tracking)
        const trackedBody = injectTracking(body, activity.id, baseUrl);

        // 6. Send Email
        await transporter.sendMail({
            from: `"${currentAccount.fromName || currentAccount.username}" <${currentAccount.fromEmail || currentAccount.username}>`,
            to: contact.email,
            subject,
            html: trackedBody,
        });

        // 6. Update Enrollment
        const nextStepIndex = currentStepIndex + 1;
        const nextStep = steps[nextStepIndex];

        const updates: EnrollmentUpdate = {
            currentStep: nextStepIndex,
            updatedAt: new Date().toISOString()
        };

        if (nextStep) {
            const nextSendAt = new Date();
            const delayValue = nextStep.delay_days ?? 1;
            const delayUnit = nextStep.delay_unit || 'days';

            if (delayUnit === 'minutes') {
                nextSendAt.setMinutes(nextSendAt.getMinutes() + delayValue);
            } else if (delayUnit === 'hours') {
                nextSendAt.setHours(nextSendAt.getHours() + delayValue);
            } else {
                nextSendAt.setDate(nextSendAt.getDate() + delayValue);
            }

            updates.nextSendAt = nextSendAt.toISOString();
        } else {
            updates.status = 'completed';
            updates.nextSendAt = null;
        }

        await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: updates
        });

        return { id: enrollment.id, status: 'success', message: 'Email sent successfully' };
    } catch (err: unknown) {
        console.error(`Error processing enrollment ${enrollment.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { id: enrollment.id, status: 'error', message: errorMessage };
    }
}

export async function POST() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user;

    try {
        // Fetch enrollments
        const enrollments = await prisma.sequenceEnrollment.findMany({
            where: {
                status: 'active',
                OR: [
                    { nextSendAt: { lte: new Date() } },
                    { nextSendAt: null }
                ]
            },
            include: {
                contact: true,
                sequence: true
            }
        });

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json({
                success: true,
                processed: 0,
                details: [],
                message: 'No enrollments due for processing'
            });
        }

        // Processing Map
        const transporters = new Map<string, nodemailer.Transporter>();
        const BATCH_SIZE = 5;
        const results = [];

        // Process in batches
        for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
            const batch = enrollments.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(e => processEnrollment(e, transporters, user))
            );
            results.push(...batchResults);
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const failureCount = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            success: true,
            processed: results.length,
            successCount,
            failureCount,
            details: results
        });

    } catch (error: unknown) {
        console.error('Sequence processing failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
