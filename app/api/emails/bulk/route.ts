import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { subject, body, contactIds, isSelectAllMatching, filters } = payload;

        if (!subject || !body) {
            return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });
        
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Get User Organization
        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { organizationId: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: "Profile/Organization not found" }, { status: 404 });
        }

        const orgId = profile.organizationId;

        // Resolve Contacts
        let contacts: { id: string, email: string | null, firstName: string, lastName: string | null, organizationId: string }[] = [];

        if (isSelectAllMatching) {
            const where: Prisma.ContactWhereInput = {
                organizationId: orgId
            };
            
            if (filters?.search) {
                where.OR = [
                    { firstName: { contains: filters.search, mode: 'insensitive' } },
                    { lastName: { contains: filters.search, mode: 'insensitive' } },
                    { email: { contains: filters.search, mode: 'insensitive' } },
                    { company: { contains: filters.search, mode: 'insensitive' } }
                ];
            }
            if (filters?.status && filters.status !== "all") {
                where.customFields = {
                    path: ['status'],
                    equals: filters.status
                };
            }
            if (filters?.ownerId && filters.ownerId !== "all") {
                where.ownerId = filters.ownerId;
            }

            const data = await prisma.contact.findMany({
                where,
                select: { id: true, email: true, firstName: true, lastName: true, organizationId: true }
            });
            contacts = data;
        } else {
            if (!contactIds || contactIds.length === 0) {
                return NextResponse.json({ error: 'No contacts specified' }, { status: 400 });
            }
            const data = await prisma.contact.findMany({
                where: {
                    id: { in: contactIds },
                    organizationId: orgId
                },
                select: { id: true, email: true, firstName: true, lastName: true, organizationId: true }
            });
            contacts = data;
        }

        contacts = contacts.filter(c => !!c.email);

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'No selected contacts have valid email addresses.' }, { status: 400 });
        }

        const queuePayloads = contacts.map(contact => {
            let finalSubject = subject;
            let finalBody = body;
            
            const variables: Record<string, string> = {
                first_name: contact.firstName || 'there',
                last_name: contact.lastName || ''
            };

            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = new RegExp(`{{${key}}}`, 'g');
                finalSubject = finalSubject.replace(placeholder, value);
                finalBody = finalBody.replace(placeholder, value);
            });

            return {
                organization_id: orgId,
                to_email: contact.email!,
                subject: finalSubject,
                body_html: finalBody,
                contact_id: contact.id,
                status: 'pending'
            };
        });

        if (queuePayloads.length > 0) {
            // Note: If you don't have an email_queue model in Prisma schema, you might need to use raw SQL
            // Wait, does email_queue exist in Prisma? It doesn't seem to be in schema.prisma.
            // Let's use $executeRaw for the queue insert.
            for (const payload of queuePayloads) {
                await prisma.$executeRaw`
                    INSERT INTO email_queue (organization_id, to_email, subject, body_html, contact_id, status)
                    VALUES (CAST(${payload.organization_id} AS UUID), ${payload.to_email}, ${payload.subject}, ${payload.body_html}, CAST(${payload.contact_id} AS UUID), ${payload.status})
                `;
            }
        }

        const queuedCount = queuePayloads.length;

        return NextResponse.json({ success: true, queuedCount });
    } catch (error) {
        console.error('Bulk email error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
