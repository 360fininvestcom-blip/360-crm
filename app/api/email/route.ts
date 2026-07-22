import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user;

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    try {
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { organizationId: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const orgId = profile.organizationId;

        const data: any[] = await prisma.$queryRaw`
            SELECT * FROM emails
            WHERE organization_id = CAST(${orgId} AS UUID)
              AND folder = ${folder}
            ORDER BY received_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const counts: any[] = await prisma.$queryRaw`
            SELECT COUNT(*) FROM emails
            WHERE organization_id = CAST(${orgId} AS UUID)
              AND folder = ${folder}
        `;
        const count = Number(counts[0].count);

        return NextResponse.json({
            data,
            meta: {
                page,
                limit,
                total: count,
                folder
            }
        });

    } catch (error: any) {
        console.error('Error fetching emails:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
