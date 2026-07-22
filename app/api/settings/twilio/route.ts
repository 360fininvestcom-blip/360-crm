import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { accountSid, authToken, fromNumber, isActive, orgId } = payload;

        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = session.user;

        // Ensure user belongs to the org and is admin
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { organizationId: true, role: true }
        });

        if (!profile || profile.organizationId !== orgId || profile.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized or not admin" }, { status: 403 });
        }

        // Upsert logic
        const existingArr: any[] = await prisma.$queryRaw`
            SELECT id, auth_token_encrypted FROM twilio_configs
            WHERE organization_id = CAST(${orgId} AS UUID)
            LIMIT 1
        `;
        const existing = existingArr[0];

        let finalAuthToken = existing?.auth_token_encrypted || '';
        if (authToken) {
            finalAuthToken = encrypt(authToken);
        }

        const updatedAt = new Date().toISOString();

        if (existing) {
            await prisma.$executeRaw`
                UPDATE twilio_configs
                SET account_sid = ${accountSid},
                    auth_token_encrypted = ${finalAuthToken},
                    from_number = ${fromNumber},
                    is_active = ${isActive},
                    updated_at = CAST(${updatedAt} AS TIMESTAMPTZ)
                WHERE id = CAST(${existing.id} AS UUID)
            `;
        } else {
            if (!authToken) {
                 return NextResponse.json({ error: "Auth token required for new setup" }, { status: 400 });
            }
            await prisma.$executeRaw`
                INSERT INTO twilio_configs (organization_id, account_sid, auth_token_encrypted, from_number, is_active, updated_at)
                VALUES (CAST(${orgId} AS UUID), ${accountSid}, ${finalAuthToken}, ${fromNumber}, ${isActive}, CAST(${updatedAt} AS TIMESTAMPTZ))
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Twilio config error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
