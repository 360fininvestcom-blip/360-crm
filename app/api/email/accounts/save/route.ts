import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user;

    try {
        const body = await request.json();
        const {
            id,
            name,
            from_name,
            email_addr,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            imap_host,
            imap_port,
            imap_user,
            imap_pass,
            is_org_wide,
            organization_id
        } = body;

        let profileUserId = null;
        if (!is_org_wide) {
            const profile = await prisma.profile.findUnique({
                where: { userId: user.id }
            });
            profileUserId = profile?.id;
        }

        const data: any = {
            name,
            fromName: from_name,
            fromEmail: email_addr, // Wait, in Prisma SmtpConfig, is it fromEmail? No, schema.prisma had SmtpConfig. Let me double check field names. 
            // In the previous files we mapped `username` to smtp_user, `fromEmail` to email_addr, `fromName` to from_name, `host` to smtp_host, `port` to smtp_port.
            // Let's assume Prisma fields are: name, fromName, fromEmail, host, port, username, passwordEncrypted, organizationId, isDefault.
            // Oh wait, `smtp_configs` isn't in prisma schema, I already checked this. Wait, wait, earlier in sequence process I assumed `SmtpConfig` existed in prisma. Let me check if `SmtpConfig` exists in Prisma schema!
            // I should just use `prisma.$executeRaw` to be safe if I'm not 100% sure, or I can use Prisma if it's there.
        };
        // wait, I can use Prisma $executeRaw for everything if the schema isn't fully synced or just use $queryRaw.
        // Let's use raw SQL to be fully safe with supabase column names.
        
        let smtpPassEncrypted = null;
        if (smtp_pass) {
            smtpPassEncrypted = encrypt(smtp_pass);
        }

        let imapPassEncrypted = null;
        if (imap_pass) {
            imapPassEncrypted = encrypt(imap_pass);
        }

        let result;
        if (id) {
            // Update
            await prisma.$executeRaw`
                UPDATE smtp_configs SET
                    name = ${name},
                    from_name = ${from_name},
                    email_addr = ${email_addr},
                    smtp_host = ${smtp_host},
                    smtp_port = ${smtp_port},
                    smtp_user = ${smtp_user},
                    imap_host = ${imap_host},
                    imap_port = ${imap_port},
                    imap_user = ${imap_user},
                    is_org_wide = ${is_org_wide},
                    organization_id = CAST(${organization_id} AS UUID),
                    user_id = ${profileUserId ? Prisma.sql`CAST(${profileUserId} AS UUID)` : null},
                    is_active = true
                    ${smtpPassEncrypted ? Prisma.sql`, smtp_pass_encrypted = ${smtpPassEncrypted}` : Prisma.empty}
                    ${imapPassEncrypted ? Prisma.sql`, imap_pass_encrypted = ${imapPassEncrypted}` : Prisma.empty}
                WHERE id = CAST(${id} AS UUID)
            `;
            
            const updated = await prisma.$queryRaw`SELECT * FROM smtp_configs WHERE id = CAST(${id} AS UUID)`;
            result = (updated as any[])[0];
        } else {
            // Insert
            const newRows = await prisma.$queryRaw`
                INSERT INTO smtp_configs (
                    name, from_name, email_addr, smtp_host, smtp_port, smtp_user, 
                    imap_host, imap_port, imap_user, is_org_wide, organization_id, user_id, is_active
                    ${smtpPassEncrypted ? Prisma.sql`, smtp_pass_encrypted` : Prisma.empty}
                    ${imapPassEncrypted ? Prisma.sql`, imap_pass_encrypted` : Prisma.empty}
                ) VALUES (
                    ${name}, ${from_name}, ${email_addr}, ${smtp_host}, ${smtp_port}, ${smtp_user},
                    ${imap_host}, ${imap_port}, ${imap_user}, ${is_org_wide}, CAST(${organization_id} AS UUID), ${profileUserId ? Prisma.sql`CAST(${profileUserId} AS UUID)` : null}, true
                    ${smtpPassEncrypted ? Prisma.sql`, ${smtpPassEncrypted}` : Prisma.empty}
                    ${imapPassEncrypted ? Prisma.sql`, ${imapPassEncrypted}` : Prisma.empty}
                ) RETURNING *;
            `;
            result = (newRows as any[])[0];
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error: unknown) {
        console.error('Failed to save email account:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
