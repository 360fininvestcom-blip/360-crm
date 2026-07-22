"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

export async function getOrganizationApiKeys() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const keys = await prisma.$queryRaw`
        SELECT id, label, key_prefix, scopes, last_used_at, created_at 
        FROM organization_api_keys
        WHERE organization_id = CAST(${organizationId} AS UUID)
        ORDER BY created_at DESC
    `;
    
    return keys as any[];
}

export async function createOrganizationApiKey(label: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const rawKey = randomBytes(32).toString('hex');
    const keyPrefix = rawKey.substring(0, 8);
    const scopes = ["leads:read", "leads:write"];

    await prisma.$executeRaw`
        INSERT INTO organization_api_keys (organization_id, label, key_hash, key_prefix, scopes)
        VALUES (
            CAST(${organizationId} AS UUID),
            ${label},
            ${rawKey},
            ${keyPrefix},
            ${scopes}
        )
    `;

    return { apiKey: rawKey };
}

export async function deleteOrganizationApiKey(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    await prisma.$executeRaw`
        DELETE FROM organization_api_keys
        WHERE id = CAST(${id} AS UUID)
        AND organization_id = CAST(${organizationId} AS UUID)
    `;
}

export async function getCrmApiKey() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const data = await prisma.$queryRaw`
        SELECT crm_api_key 
        FROM api_keys
        WHERE organization_id = CAST(${organizationId} AS UUID)
        LIMIT 1
    `;
    
    // @ts-ignore
    return (data[0]?.crm_api_key as string) || null;
}

export async function updateCrmApiKey(key: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    await prisma.$executeRaw`
        UPDATE api_keys
        SET crm_api_key = ${key}, updated_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
        WHERE organization_id = CAST(${organizationId} AS UUID)
    `;
}
