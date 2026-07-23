"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Profile, Organization, SIPProfile, APIKeys, UserIntegration } from "@/types";

async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function getActiveProfile() {
    const session = await getSession();
    if (!session?.user) return null;
    return await prisma.profile.findFirst({
        where: { userId: session.user.id }
    });
}

export async function getProfiles() {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    return await prisma.profile.findMany({
        orderBy: { createdAt: "desc" }
    });
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrganization(id: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");
        if (!id || !uuidRegex.test(id)) return null;
        return await prisma.organization.findUnique({
            where: { id }
        });
    } catch (error) {
        console.error("[getOrganization] Error fetching organization:", error);
        return null;
    }
}

export async function getApiKeys(orgId: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");
        if (!orgId || !uuidRegex.test(orgId)) return null;
        return await prisma.apiKey.findFirst({
            where: { organizationId: orgId }
        });
    } catch (error) {
        console.error("[getApiKeys] Error fetching API keys:", error);
        return null;
    }
}

export async function getIntegrations(userId: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");
        if (!userId || !uuidRegex.test(userId)) return [];
        return await prisma.userIntegration.findMany({
            where: { userId }
        });
    } catch (error) {
        console.error("[getIntegrations] Error fetching integrations:", error);
        return [];
    }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    return await prisma.profile.update({
        where: { id },
        data: updates
    });
}

export async function deleteProfile(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    await prisma.profile.delete({
        where: { id }
    });
}

export async function updateOrganization(id: string, updates: Partial<Organization>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    return await prisma.organization.update({
        where: { id },
        data: updates
    });
}

export async function updateApiKeys(orgId: string, updates: Partial<APIKeys>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    
    const existing = await prisma.apiKey.findFirst({
        where: { organizationId: orgId }
    });

    if (existing) {
        return await prisma.apiKey.update({
            where: { id: existing.id },
            data: updates
        });
    } else {
        return await prisma.apiKey.create({
            data: {
                ...updates,
                organizationId: orgId
            } as any
        });
    }
}

export async function getSipAccounts(userId: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");

        const isUuid = uuidRegex.test(userId);

        const profile = await prisma.profile.findFirst({
            where: isUuid
                ? {
                    OR: [
                        { id: userId },
                        { userId }
                    ]
                  }
                : {
                    userId
                  }
        });
        if (!profile) return [];

        return await prisma.sipProfile.findMany({
            where: { userId: profile.id },
            orderBy: [
                { isDefault: "desc" },
                { createdAt: "asc" }
            ]
        });
    } catch (error) {
        console.error("[getSipAccounts] Error fetching SIP profiles:", error);
        return [];
    }
}

export async function saveSipAccount(id: string | undefined, userId: string, orgId: string, data: Partial<SIPProfile>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const accountData = {
        ...data,
        userId,
        organizationId: orgId
    } as any;

    if (id) {
        return await prisma.sipProfile.update({
            where: { id },
            data: accountData
        });
    } else {
        return await prisma.sipProfile.create({
            data: accountData
        });
    }
}

export async function deleteSipAccount(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    await prisma.sipProfile.delete({
        where: { id }
    });
}

export async function setDefaultSipAccount(id: string, userId: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    
    // First remove default from all other profiles for this user
    await prisma.sipProfile.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false }
    });

    // Set default for this one
    return await prisma.sipProfile.update({
        where: { id },
        data: { isDefault: true }
    });
}

export async function getTwilioConfig(orgId: string) {
    try {
        const session = await getSession();
        if (!session?.user) throw new Error("Unauthorized");

        if (!orgId || !uuidRegex.test(orgId)) {
            console.warn(`[getTwilioConfig] Invalid organization ID: ${orgId}`);
            return null;
        }
        
        const config = await prisma.$queryRaw`
            SELECT * FROM twilio_configs
            WHERE organization_id = CAST(${orgId} AS UUID)
            LIMIT 1
        `;
        
        // @ts-ignore
        return config[0] || null;
    } catch (error) {
        console.error("[getTwilioConfig] Error fetching Twilio configuration:", error);
        return null;
    }
}
