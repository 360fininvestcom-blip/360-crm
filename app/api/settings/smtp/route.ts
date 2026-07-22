import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const accounts = await prisma.$queryRaw`
            SELECT * FROM smtp_configs
            ORDER BY created_at DESC
        `;
        return NextResponse.json(accounts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = session.user;

        const { id, updates, orgId: providedOrgId } = await request.json();

        // 1. Get user org and role
        const profile = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { id: true, organizationId: true, role: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const orgId = providedOrgId || profile.organizationId;

        // 2. Security Check: Only admins/managers can add/edit shared accounts
        if (updates.is_org_wide && profile.role !== 'admin' && profile.role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden: Only admins can manage shared accounts' }, { status: 403 });
        }

        // 3. Handle Encryption for both SMTP and IMAP
        if (updates.smtp_pass_plain) {
            updates.smtp_pass_encrypted = encrypt(updates.smtp_pass_plain);
            delete updates.smtp_pass_plain;
        }
        if (updates.imap_pass_plain) {
            updates.imap_pass_encrypted = encrypt(updates.imap_pass_plain);
            delete updates.imap_pass_plain;
        }

        // 4. Upsert Logic
        const updatedAt = new Date().toISOString();
        let result = { id: id || undefined };

        if (id) {
            // Update
            const setClauses = [];
            const values = [];
            let i = 1;
            for (const [key, value] of Object.entries(updates)) {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
            }
            setClauses.push(Prisma.sql`updated_at = CAST(${updatedAt} AS TIMESTAMPTZ)`);
            
            await prisma.$executeRaw`
                UPDATE smtp_configs
                SET ${Prisma.join(setClauses, ', ')}
                WHERE id = CAST(${id} AS UUID)
            `;

            const updatedData = await prisma.$queryRaw`SELECT * FROM smtp_configs WHERE id = CAST(${id} AS UUID)`;
            result = (updatedData as any[])[0];
        } else {
            // Insert
            const insertUpdates = {
                ...updates,
                organization_id: orgId,
                user_id: updates.is_org_wide ? null : profile.id, // Assign to user if not org-wide
                created_at: updatedAt,
                updated_at: updatedAt
            };

            const columns = Object.keys(insertUpdates).map(k => Prisma.raw(k));
            const values = Object.values(insertUpdates).map(v => {
                // If it's the date string, cast it appropriately if needed, or just let PG handle it. But to be safe:
                if (typeof v === 'string' && v === updatedAt) {
                    return Prisma.sql`CAST(${v} AS TIMESTAMPTZ)`;
                }
                if (['organization_id', 'user_id'].includes(Object.keys(insertUpdates)[Object.values(insertUpdates).indexOf(v)])) {
                    return v ? Prisma.sql`CAST(${v} AS UUID)` : null;
                }
                return v;
            });
            
            const returned: any[] = await prisma.$queryRaw`
                INSERT INTO smtp_configs (${Prisma.join(columns, ', ')})
                VALUES (${Prisma.join(values, ', ')})
                RETURNING *
            `;
            result = returned[0];
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('SMTP Save Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.$executeRaw`
            DELETE FROM smtp_configs
            WHERE id = CAST(${id} AS UUID)
        `;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
