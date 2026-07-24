"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { EmailTemplate, EmailSequence, SequenceEnrollment, SMTPConfig } from "@/types";
import { Prisma } from "@prisma/client";

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const templates = await prisma.$queryRaw`
        SELECT * FROM email_templates
        ORDER BY created_at DESC
    `;
    return templates as EmailTemplate[];
}

export async function getEmailSequences(): Promise<EmailSequence[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const sequences = await prisma.$queryRaw`
        SELECT * FROM email_sequences
        ORDER BY created_at DESC
    `;
    return (sequences as any[]).map(seq => ({
        ...seq,
        steps: typeof seq.steps === 'string' ? JSON.parse(seq.steps) : seq.steps
    })) as EmailSequence[];
}

export async function getSMTPConfigs(): Promise<SMTPConfig[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const configs = await prisma.$queryRaw`
        SELECT * FROM smtp_configs
        ORDER BY created_at DESC
    `;
    return configs as SMTPConfig[];
}

export async function createEmailSequence(arg: Omit<EmailSequence, "id" | "createdAt" | "updatedAt">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    return prisma.emailSequence.create({
        data: {
            ...arg,
            steps: arg.steps as Prisma.InputJsonValue,
        }
    });
}

export async function updateEmailSequence(id: string, updates: Partial<EmailSequence>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    return prisma.emailSequence.update({
        where: { id },
        data: {
            ...updates,
            steps: updates.steps ? (updates.steps as Prisma.InputJsonValue) : undefined,
        }
    });
}

export async function deleteEmailSequence(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    await prisma.emailSequence.delete({
        where: { id }
    });
}

export async function createEmailTemplate(arg: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    return prisma.emailTemplate.create({
        data: arg
    });
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    return prisma.emailTemplate.update({
        where: { id },
        data: updates
    });
}

export async function deleteEmailTemplate(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");

    await prisma.emailTemplate.delete({
        where: { id }
    });
}

export async function getSequenceEnrollments(sequenceId: string): Promise<SequenceEnrollment[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const enrollments = await prisma.$queryRaw`
        SELECT 
            se.*,
            json_build_object('id', c.id, 'first_name', c.first_name, 'last_name', c.last_name, 'email', c.email) as contact
        FROM sequence_enrollments se
        LEFT JOIN contacts c ON se.contact_id = c.id
        WHERE se.sequence_id = CAST(${sequenceId} AS UUID)
        ORDER BY se.created_at DESC
    `;

    return enrollments as SequenceEnrollment[];
}

export async function enrollInSequence(arg: { sequence_id: string; contact_ids: string[]; organization_id: string }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const values = [];
    for (const contact_id of arg.contact_ids) {
        values.push(Prisma.sql`(CAST(${arg.organization_id} AS UUID), CAST(${arg.sequence_id} AS UUID), CAST(${contact_id} AS UUID), 'active', 0, CAST(${new Date().toISOString()} AS TIMESTAMPTZ))`);
    }

    if (values.length === 0) return [];

    const result = await prisma.$queryRaw`
        INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, status, current_step, next_send_at)
        VALUES ${Prisma.join(values, ', ')}
        RETURNING *
    `;
    
    return result;
}

export async function updateEnrollment(id: string, updates: Partial<SequenceEnrollment>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const setClauses = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id') {
            if (key === 'organization_id' || key === 'sequence_id' || key === 'contact_id') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS UUID)`);
            } else if (key === 'next_send_at') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS TIMESTAMPTZ)`);
            } else {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
            }
        }
    }
    
    const result = await prisma.$queryRaw`
        UPDATE sequence_enrollments
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = CAST(${id} AS UUID)
        RETURNING *
    `;
    
    
    // @ts-ignore
    return result[0];
}

export async function getEmailMetrics() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const emails = await prisma.$queryRaw`
        SELECT id, opens_count, clicks_count, received_at 
        FROM emails
        WHERE organization_id = CAST(${organizationId} AS UUID)
        AND folder = 'sent'
    `;
    
    return emails as any[];
}
