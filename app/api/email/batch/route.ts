import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    try {
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
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const orgId = profile.organizationId;

        const body = await request.json();
        const { emailIds, action, destination } = body;

        if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
            return NextResponse.json({ error: 'Invalid email IDs' }, { status: 400 });
        }

        if (!action) {
            return NextResponse.json({ error: 'Action required' }, { status: 400 });
        }

        const idsQuery = Prisma.join(emailIds.map((id: string) => Prisma.sql`CAST(${id} AS UUID)`));

        if (action === 'delete') {
            // Permanent delete
            await prisma.$executeRaw`
                DELETE FROM emails
                WHERE organization_id = CAST(${orgId} AS UUID)
                  AND id IN (${idsQuery})
            `;
        } else if (action === 'move') {
            if (!destination) return NextResponse.json({ error: 'Destination folder required' }, { status: 400 });

            await prisma.$executeRaw`
                UPDATE emails
                SET folder = ${destination}
                WHERE organization_id = CAST(${orgId} AS UUID)
                  AND id IN (${idsQuery})
            `;
        } else if (action === 'mark_read') {
            await prisma.$executeRaw`
                UPDATE emails
                SET is_read = true
                WHERE organization_id = CAST(${orgId} AS UUID)
                  AND id IN (${idsQuery})
            `;
        } else if (action === 'mark_unread') {
            await prisma.$executeRaw`
                UPDATE emails
                SET is_read = false
                WHERE organization_id = CAST(${orgId} AS UUID)
                  AND id IN (${idsQuery})
            `;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error performing batch action:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
