import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { message, contactIds, isSelectAllMatching, filters } = payload;

        if (!message) {
            return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
        }

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { organizationId: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const orgId = profile.organizationId;

        // Check if Twilio config exists using raw query since it's not in schema
        const twilioConfigs: any[] = await prisma.$queryRaw`
            SELECT id FROM twilio_configs 
            WHERE organization_id = CAST(${orgId} AS UUID) AND is_active = true 
            LIMIT 1;
        `;

        if (!twilioConfigs || twilioConfigs.length === 0) {
            return NextResponse.json({ error: 'Please configure Twilio settings in Integrations before sending bulk SMS.' }, { status: 400 });
        }

        // Resolve Contacts
        let contacts: { id: string, phone: string | null, firstName: string, lastName: string | null, organizationId: string }[] = [];

        if (isSelectAllMatching) {
            const where: Prisma.ContactWhereInput = {
                organizationId: orgId
            };
            
            if (filters?.search) {
                where.OR = [
                    { firstName: { contains: filters.search, mode: 'insensitive' } },
                    { lastName: { contains: filters.search, mode: 'insensitive' } },
                    { phone: { contains: filters.search, mode: 'insensitive' } }
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
                select: { id: true, phone: true, firstName: true, lastName: true, organizationId: true }
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
                select: { id: true, phone: true, firstName: true, lastName: true, organizationId: true }
            });
            contacts = data;
        }

        contacts = contacts.filter(c => !!c.phone);

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'No selected contacts have valid phone numbers.' }, { status: 400 });
        }

        const queuePayloads = contacts.map(contact => {
            let finalMessage = message;
            
            const variables: Record<string, string> = {
                first_name: contact.firstName || 'there',
                last_name: contact.lastName || ''
            };

            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = new RegExp(`{{${key}}}`, 'g');
                finalMessage = finalMessage.replace(placeholder, value);
            });

            return {
                organization_id: orgId,
                to_phone: contact.phone!,
                message: finalMessage,
                contact_id: contact.id,
                status: 'pending'
            };
        });

        if (queuePayloads.length > 0) {
            for (const payload of queuePayloads) {
                await prisma.$executeRaw`
                    INSERT INTO sms_queue (organization_id, to_phone, message, contact_id, status)
                    VALUES (CAST(${payload.organization_id} AS UUID), ${payload.to_phone}, ${payload.message}, CAST(${payload.contact_id} AS UUID), ${payload.status})
                `;
            }
        }

        return NextResponse.json({ success: true, queuedCount: queuePayloads.length });
    } catch (error) {
        console.error('Bulk SMS error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
