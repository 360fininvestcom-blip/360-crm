"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { CallLog } from "@/types";

async function getAuthProfile() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    if (!profile.organizationId) throw new Error("No organization associated with profile");
    return profile as typeof profile & { organizationId: string };
}

export async function getCallLogs(limit = 50, contactId?: string): Promise<CallLog[]> {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) return [];

        const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
        if (!profile) return [];

        const logs = await prisma.callLog.findMany({
            where: {
                userId: profile.id,
                contactId: contactId ? contactId : undefined
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            },
            orderBy: { startedAt: "desc" },
            take: limit
        });

        // Map camelCase to snake_case format to support legacy code formatting in type interfaces
        return logs.map(log => ({
            id: log.id,
            organization_id: log.organizationId,
            user_id: log.userId,
            contact_id: log.contactId || undefined,
            phone_number: log.phoneNumber,
            direction: log.direction as "inbound" | "outbound",
            status: log.status as any,
            duration_seconds: log.durationSeconds,
            outcome: log.outcome || undefined,
            notes: log.notes || undefined,
            recording_url: log.recordingUrl || undefined,
            transcription: log.transcription,
            summary: log.summary,
            started_at: log.startedAt.toISOString(),
            ended_at: log.endedAt?.toISOString() || undefined,
            created_at: log.createdAt.toISOString(),
            contact: log.contact ? {
                id: log.contact.id,
                first_name: log.contact.firstName,
                last_name: log.contact.lastName,
                phone: log.contact.phone
            } : null
        }));
    } catch (error) {
        console.error("Failed to get call logs:", error);
        return [];
    }
}

export async function createCallLog(arg: Omit<CallLog, "id" | "created_at">) {
    const profile = await getAuthProfile();

    const startedAt = arg.started_at ? new Date(arg.started_at) : new Date();
    const endedAt = arg.ended_at ? new Date(arg.ended_at) : null;

    const log = await prisma.callLog.create({
        data: {
            organizationId: profile.organizationId,
            userId: profile.id,
            contactId: arg.contact_id || null,
            phoneNumber: arg.phone_number,
            direction: arg.direction,
            status: arg.status,
            durationSeconds: arg.duration_seconds || 0,
            outcome: arg.outcome || null,
            notes: arg.notes || null,
            recordingUrl: arg.recording_url || null,
            transcription: arg.transcription || null,
            summary: arg.summary || null,
            startedAt,
            endedAt
        }
    });

    return {
        id: log.id,
        organization_id: log.organizationId,
        user_id: log.userId,
        contact_id: log.contactId || undefined,
        phone_number: log.phoneNumber,
        direction: log.direction as "inbound" | "outbound",
        status: log.status as any,
        duration_seconds: log.durationSeconds,
        outcome: log.outcome || undefined,
        notes: log.notes || undefined,
        recording_url: log.recordingUrl || undefined,
        transcription: log.transcription,
        summary: log.summary,
        started_at: log.startedAt.toISOString(),
        ended_at: log.endedAt?.toISOString() || undefined,
        created_at: log.createdAt.toISOString()
    } as CallLog;
}
