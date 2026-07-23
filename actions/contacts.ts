"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

async function getAuthProfile() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    if (!profile.organizationId) throw new Error("No organization associated with profile");
    return profile as typeof profile & { organizationId: string };
}

export async function getAllContactsForExport(ownerId?: string) {
    const profile = await getAuthProfile();

    return await prisma.contact.findMany({
        where: {
            organizationId: profile.organizationId,
            ownerId: ownerId || undefined
        },
        orderBy: { createdAt: "desc" }
    });
}

export async function getContactsForAutoDialer(filters: { search?: string, status?: string, ownerId?: string }) {
    const profile = await getAuthProfile();

    return await prisma.contact.findMany({
        where: {
            organizationId: profile.organizationId,
            status: filters.status && filters.status !== "all" ? filters.status : undefined,
            ownerId: filters.ownerId || undefined,
            OR: filters.search ? [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { company: { contains: filters.search, mode: 'insensitive' } }
            ] : undefined
        },
        select: {
            firstName: true,
            lastName: true,
            phone: true
        }
    });
}

export async function getContactsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    const profile = await getAuthProfile();

    return await prisma.contact.findMany({
        where: {
            organizationId: profile.organizationId,
            id: { in: ids }
        },
        select: {
            firstName: true,
            lastName: true,
            phone: true
        }
    });
}

export async function getContactById(id: string) {
    try {
        const profile = await getAuthProfile();

        return await prisma.contact.findFirst({
            where: {
                id,
                organizationId: profile.organizationId
            }
        });
    } catch (error) {
        console.error("Failed to get contact by ID:", error);
        return null;
    }
}

export async function getActivitiesForContact(contactId: string) {
    try {
        const profile = await getAuthProfile();

        const activities = await prisma.activity.findMany({
            where: {
                contactId,
                organizationId: profile.organizationId
            },
            include: {
                createdBy: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Map to legacy UI format where created_by_profile holds the author details and created_at is string
        return activities.map(act => ({
            id: act.id,
            organization_id: act.organizationId,
            contact_id: act.contactId,
            deal_id: act.dealId,
            type: act.type,
            title: act.title,
            description: act.description,
            metadata: (act.metadata || {}) as Record<string, unknown>,
            created_at: act.createdAt.toISOString(),
            created_by_profile: act.createdBy ? {
                full_name: act.createdBy.fullName,
                avatar_url: act.createdBy.avatarUrl
            } : null
        }));
    } catch (error) {
        console.error("Failed to get activities:", error);
        return [];
    }
}

export async function getDealsForContact(contactId: string) {
    try {
        const profile = await getAuthProfile();

        return await prisma.deal.findMany({
            where: {
                contactId,
                organizationId: profile.organizationId
            },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        console.error("Failed to get deals:", error);
        return [];
    }
}

export async function getTasksForContact(contactId: string) {
    try {
        const profile = await getAuthProfile();

        return await prisma.task.findMany({
            where: {
                contactId,
                organizationId: profile.organizationId
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { dueDate: "asc" }
        });
    } catch (error) {
        console.error("Failed to get tasks:", error);
        return [];
    }
}

export async function addNoteToContact(contactId: string, description: string) {
    const profile = await getAuthProfile();

    const activity = await prisma.activity.create({
        data: {
            organizationId: profile.organizationId,
            contactId,
            type: "note",
            title: "Note added",
            description,
            createdById: profile.id
        },
        include: {
            createdBy: {
                select: {
                    fullName: true,
                    avatarUrl: true
                }
            }
        }
    });

    return {
        id: activity.id,
        organization_id: activity.organizationId,
        contact_id: activity.contactId,
        deal_id: activity.dealId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        metadata: (activity.metadata || {}) as Record<string, unknown>,
        created_at: activity.createdAt.toISOString(),
        created_by_profile: activity.createdBy ? {
            full_name: activity.createdBy.fullName,
            avatar_url: activity.createdBy.avatarUrl
        } : null
    };
}

export async function getTestContacts(limit: number = 20) {
    try {
        const profile = await getAuthProfile();

        return await prisma.contact.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { firstName: "asc" },
            take: limit
        });
    } catch (error) {
        console.error("Failed to get test contacts:", error);
        return [];
    }
}
