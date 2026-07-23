"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getAdminProfile() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    if (profile.role !== "admin" && profile.role !== "manager") {
        throw new Error("Forbidden: Admin or Manager role required");
    }
    if (!profile.organizationId) {
        throw new Error("Profile has no associated organization");
    }
    return profile as typeof profile & { organizationId: string };
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function getAnnouncements() {
    try {
        const profile = await getAdminProfile();
        return await prisma.announcement.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        console.error("Failed to get announcements:", error);
        return [];
    }
}

export async function createAnnouncement(data: {
    title: string;
    slug: string;
    content: string;
    coverImageUrl?: string;
    published?: boolean;
}) {
    const profile = await getAdminProfile();
    const ann = await prisma.announcement.create({
        data: {
            ...data,
            organizationId: profile.organizationId,
        }
    });
    revalidatePath("/");
    return ann;
}

export async function updateAnnouncement(id: string, updates: {
    title?: string;
    slug?: string;
    content?: string;
    coverImageUrl?: string;
    published?: boolean;
}) {
    const profile = await getAdminProfile();
    const ann = await prisma.announcement.update({
        where: { id, organizationId: profile.organizationId },
        data: updates
    });
    revalidatePath("/");
    return ann;
}

export async function deleteAnnouncement(id: string) {
    const profile = await getAdminProfile();
    await prisma.announcement.delete({
        where: { id, organizationId: profile.organizationId }
    });
    revalidatePath("/");
    return { success: true };
}

// ============================================
// SALES CAMPAIGNS
// ============================================

export async function getSalesCampaigns() {
    try {
        const profile = await getAdminProfile();
        return await prisma.salesCampaign.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        console.error("Failed to get sales campaigns:", error);
        return [];
    }
}

export async function createSalesCampaign(data: {
    title: string;
    description?: string;
    targetRevenue: number;
    isActive?: boolean;
}) {
    const profile = await getAdminProfile();
    const campaign = await prisma.salesCampaign.create({
        data: {
            title: data.title,
            description: data.description,
            targetRevenue: data.targetRevenue,
            isActive: data.isActive ?? true,
            organizationId: profile.organizationId
        }
    });
    revalidatePath("/");
    return campaign;
}

export async function updateSalesCampaign(id: string, updates: {
    title?: string;
    description?: string;
    targetRevenue?: number;
    currentRevenue?: number;
    isActive?: boolean;
}) {
    const profile = await getAdminProfile();
    const campaign = await prisma.salesCampaign.update({
        where: { id, organizationId: profile.organizationId },
        data: {
            title: updates.title,
            description: updates.description,
            targetRevenue: updates.targetRevenue,
            currentRevenue: updates.currentRevenue,
            isActive: updates.isActive
        }
    });
    revalidatePath("/");
    return campaign;
}

export async function deleteSalesCampaign(id: string) {
    const profile = await getAdminProfile();
    await prisma.salesCampaign.delete({
        where: { id, organizationId: profile.organizationId }
    });
    revalidatePath("/");
    return { success: true };
}
