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
// BLOG POSTS
// ============================================

export async function getBlogPosts() {
    try {
        const profile = await getAdminProfile();
        return await prisma.blogPost.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        console.error("Failed to get blog posts:", error);
        return [];
    }
}

export async function createBlogPost(data: {
    title: string;
    slug: string;
    content: string;
    coverImageUrl?: string;
    published?: boolean;
}) {
    const profile = await getAdminProfile();
    const post = await prisma.blogPost.create({
        data: {
            ...data,
            organizationId: profile.organizationId,
        }
    });
    revalidatePath("/");
    return post;
}

export async function updateBlogPost(id: string, updates: {
    title?: string;
    slug?: string;
    content?: string;
    coverImageUrl?: string;
    published?: boolean;
}) {
    const profile = await getAdminProfile();
    const post = await prisma.blogPost.update({
        where: { id, organizationId: profile.organizationId },
        data: updates
    });
    revalidatePath("/");
    return post;
}

export async function deleteBlogPost(id: string) {
    const profile = await getAdminProfile();
    await prisma.blogPost.delete({
        where: { id, organizationId: profile.organizationId }
    });
    revalidatePath("/");
    return { success: true };
}

// ============================================
// DONATION CAMPAIGNS
// ============================================

export async function getDonationCampaigns() {
    try {
        const profile = await getAdminProfile();
        return await prisma.donationCampaign.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { createdAt: "desc" }
        });
    } catch (error) {
        console.error("Failed to get donation campaigns:", error);
        return [];
    }
}

export async function createDonationCampaign(data: {
    title: string;
    description?: string;
    goalAmount: number;
    isActive?: boolean;
}) {
    const profile = await getAdminProfile();
    const campaign = await prisma.donationCampaign.create({
        data: {
            title: data.title,
            description: data.description,
            goalAmount: data.goalAmount,
            isActive: data.isActive ?? true,
            organizationId: profile.organizationId
        }
    });
    revalidatePath("/");
    return campaign;
}

export async function updateDonationCampaign(id: string, updates: {
    title?: string;
    description?: string;
    goalAmount?: number;
    currentAmount?: number;
    isActive?: boolean;
}) {
    const profile = await getAdminProfile();
    const campaign = await prisma.donationCampaign.update({
        where: { id, organizationId: profile.organizationId },
        data: {
            title: updates.title,
            description: updates.description,
            goalAmount: updates.goalAmount,
            currentAmount: updates.currentAmount,
            isActive: updates.isActive
        }
    });
    revalidatePath("/");
    return campaign;
}

export async function deleteDonationCampaign(id: string) {
    const profile = await getAdminProfile();
    await prisma.donationCampaign.delete({
        where: { id, organizationId: profile.organizationId }
    });
    revalidatePath("/");
    return { success: true };
}
