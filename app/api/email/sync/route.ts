import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { decrypt } from '@/lib/crypto';

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { organization_id } = await request.json();

        // Fetch active accounts for this org
        const accounts: any[] = await prisma.$queryRaw`
            SELECT * FROM smtp_configs
            WHERE organization_id = CAST(${organization_id} AS UUID)
              AND is_active = true
        `;

        if (!accounts || accounts.length === 0) return NextResponse.json({ error: 'No active accounts found' }, { status: 404 });

        const results = [];

        for (const account of accounts) {
            // Skip if no IMAP config
            if (!account.imap_host || !account.imap_user || !account.imap_pass_encrypted) continue;

            try {
                const password = decrypt(account.imap_pass_encrypted);
                const client = new ImapFlow({
                    host: account.imap_host,
                    port: account.imap_port || 993,
                    secure: true,
                    auth: {
                        user: account.imap_user,
                        pass: password
                    },
                    logger: false
                });

                await client.connect();

                // Define folders to sync
                const foldersToSync = [
                    { remote: 'INBOX', local: 'inbox' },
                    { remote: 'Sent', local: 'sent' },
                    { remote: 'Sent Items', local: 'sent' },
                    { remote: '[Gmail]/Sent Mail', local: 'sent' }
                ];

                // Get list of actual folders to verify existence
                const actualFolders = await client.list();

                for (const folderMapping of foldersToSync) {
                    // Check if folder exists
                    const folderExists = actualFolders.some(f => f.path === folderMapping.remote);
                    if (!folderExists && folderMapping.remote !== 'INBOX') continue;

                    try {
                        const lock = await client.getMailboxLock(folderMapping.remote);
                        try {
                            const searchCriteria = account.last_sync_at
                                ? { since: new Date(account.last_sync_at) }
                                : { seq: '1:*' };

                            let uids = await client.search(searchCriteria) || [];

                            if (!account.last_sync_at) {
                                uids = uids.slice(-50);
                            }

                            for (const uid of uids) {
                                const message = await client.fetchOne(uid.toString(), { source: true });
                                if (!message || !message.source) continue;

                                const parsed: any = await simpleParser(message.source);

                                // Upsert into Prisma using raw query as emails table is not in prisma schema
                                const messageId = parsed.messageId || `${account.id}-${uid}`;
                                const fromName = parsed.from?.value[0]?.name || '';
                                const fromAddr = parsed.from?.value[0]?.address || '';
                                const toAddr = parsed.to ? (Array.isArray(parsed.to) ? (parsed.to[0] as any).value[0].address : (parsed.to as any).value[0].address) : '';
                                const subject = parsed.subject || '';
                                const bodyHtml = parsed.html || '';
                                const bodyText = parsed.text || '';
                                const folder = folderMapping.local;
                                const receivedAt = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

                                await prisma.$executeRaw`
                                    INSERT INTO emails (account_id, organization_id, message_id, uid, from_name, from_addr, to_addr, subject, body_html, body_text, folder, received_at)
                                    VALUES (CAST(${account.id} AS UUID), CAST(${account.organization_id} AS UUID), ${messageId}, ${uid}, ${fromName}, ${fromAddr}, ${toAddr}, ${subject}, ${bodyHtml}, ${bodyText}, ${folder}, CAST(${receivedAt} AS TIMESTAMPTZ))
                                    ON CONFLICT (account_id, message_id) DO UPDATE
                                    SET folder = EXCLUDED.folder,
                                        received_at = EXCLUDED.received_at
                                `;
                            }
                        } finally {
                            lock.release();
                        }
                    } catch (folderErr) {
                        console.warn(`Failed to sync folder ${folderMapping.remote} for ${account.name}:`, folderErr);
                    }
                }

                // Update last_sync_at
                const now = new Date().toISOString();
                await prisma.$executeRaw`
                    UPDATE smtp_configs
                    SET last_sync_at = CAST(${now} AS TIMESTAMPTZ)
                    WHERE id = CAST(${account.id} AS UUID)
                `;

                results.push({ account: account.name, status: 'synced' });

                await client.logout();
            } catch (err: unknown) {
                console.error(`Sync failed for account ${account.name}:`, err);
                results.push({ account: account.name, error: err instanceof Error ? err.message : "Unknown error" });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: unknown) {
        console.error('Global sync failure:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
