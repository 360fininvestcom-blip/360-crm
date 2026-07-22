import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from "next/server";
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const { enrollmentIds } = await req.json();

        if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            return NextResponse.json({ error: "No enrollment IDs provided" }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = session.user;

        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { organizationId: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: "Profile/Organization not found" }, { status: 404 });
        }

        const idsQuery = Prisma.join(enrollmentIds.map((id: string) => Prisma.sql`CAST(${id} AS UUID)`));

        const deleted: any[] = await prisma.$queryRaw`
            DELETE FROM sequence_enrollments
            WHERE organization_id = CAST(${profile.organizationId} AS UUID)
              AND id IN (${idsQuery})
            RETURNING id
        `;

        return NextResponse.json({
            success: true,
            count: enrollmentIds.length,
            deletedCount: deleted?.length || 0,
            deletedIds: deleted?.map((d: any) => d.id) || []
        });
    } catch (error: unknown) {
        console.error("[API] Unexpected error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
