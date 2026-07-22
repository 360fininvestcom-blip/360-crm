"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export async function getActivities(page: number, pageSize: number, typeFilter: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;

    const offset = (page - 1) * pageSize;

    let query = Prisma.sql`
        SELECT 
            a.*,
            json_build_object(
                'first_name', c.first_name,
                'last_name', c.last_name,
                'avatar_url', c.avatar_url
            ) as contacts,
            json_build_object(
                'name', d.name
            ) as deals,
            json_build_object(
                'full_name', p.full_name,
                'avatar_url', p.avatar_url
            ) as profiles
        FROM activities a
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN deals d ON a.deal_id = d.id
        LEFT JOIN profiles p ON a.created_by = p.id
        WHERE a.organization_id = CAST(${organizationId} AS UUID)
    `;

    if (typeFilter && typeFilter !== "all") {
        query = Prisma.sql`${query} AND a.type = ${typeFilter}`;
    }

    query = Prisma.sql`${query} ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

    const data = await prisma.$queryRaw(query);
    
    return data as any[];
}
