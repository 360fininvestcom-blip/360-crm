import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from "next/server";
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const { apiKey } = await req.json();
        if (!apiKey) {
            return NextResponse.json({ error: "API Key is required" }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = session.user;

        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { organizationId: true, role: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Only admins/managers can update CRM keys
        if (!["admin", "manager"].includes(profile.role)) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        // Upsert logic for api_keys using raw SQL
        const existingArr: any[] = await prisma.$queryRaw`
            SELECT id FROM api_keys WHERE organization_id = CAST(${profile.organizationId} AS UUID) LIMIT 1
        `;

        const updatedAt = new Date().toISOString();

        if (existingArr.length > 0) {
            await prisma.$executeRaw`
                UPDATE api_keys
                SET crm_api_key = ${apiKey},
                    active_provider = 'openai',
                    updated_at = CAST(${updatedAt} AS TIMESTAMPTZ)
                WHERE organization_id = CAST(${profile.organizationId} AS UUID)
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO api_keys (organization_id, crm_api_key, active_provider, created_at, updated_at)
                VALUES (CAST(${profile.organizationId} AS UUID), ${apiKey}, 'openai', CAST(${updatedAt} AS TIMESTAMPTZ), CAST(${updatedAt} AS TIMESTAMPTZ))
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Error updating CRM key:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
