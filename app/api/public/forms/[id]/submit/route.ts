import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();

        // Fetch form details
        const form: any[] = await prisma.$queryRaw`
            SELECT * FROM web_forms
            WHERE id = CAST(${id} AS UUID) AND is_active = true
            LIMIT 1
        `;

        if (form.length === 0) {
            return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
        }

        const formData = form[0];

        // Validate basic fields
        if (!body.email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const firstName = body.first_name || body.name?.split(' ')[0] || '';
        const lastName = body.last_name || body.name?.split(' ').slice(1).join(' ') || '';

        // Check if contact already exists
        const existingContacts: any[] = await prisma.$queryRaw`
            SELECT id FROM contacts
            WHERE organization_id = CAST(${formData.organization_id} AS UUID)
              AND email ILIKE ${body.email}
            LIMIT 1
        `;

        let contactId;
        const updatedAt = new Date().toISOString();

        if (existingContacts.length > 0) {
            contactId = existingContacts[0].id;
            // Update existing contact safely
            await prisma.$executeRaw`
                UPDATE contacts
                SET first_name = COALESCE(${firstName || null}, first_name),
                    last_name = COALESCE(${lastName || null}, last_name),
                    phone = COALESCE(${body.phone || null}, phone),
                    company = COALESCE(${body.company || null}, company),
                    updated_at = CAST(${updatedAt} AS TIMESTAMPTZ)
                WHERE id = CAST(${contactId} AS UUID)
            `;
        } else {
            // Create new contact
            const newContact: any[] = await prisma.$queryRaw`
                INSERT INTO contacts (organization_id, first_name, last_name, email, phone, company, status, created_at, updated_at)
                VALUES (
                    CAST(${formData.organization_id} AS UUID), 
                    ${firstName}, 
                    ${lastName}, 
                    ${body.email}, 
                    ${body.phone || ''}, 
                    ${body.company || ''}, 
                    'new',
                    CAST(${updatedAt} AS TIMESTAMPTZ),
                    CAST(${updatedAt} AS TIMESTAMPTZ)
                )
                RETURNING id
            `;
            contactId = newContact[0].id;
        }

        // Log the activity
        await prisma.$executeRaw`
            INSERT INTO activities (organization_id, contact_id, type, title, description, created_at)
            VALUES (
                CAST(${formData.organization_id} AS UUID),
                CAST(${contactId} AS UUID),
                'system',
                ${`Form Submitted: ${formData.name}`},
                ${`Captured via web form. Form Data: ${JSON.stringify(body)}`},
                CAST(${updatedAt} AS TIMESTAMPTZ)
            )
        `;

        return NextResponse.json({
            success: true,
            message: formData.success_message
        });

    } catch (err: any) {
        console.error('Form submission error:', err);
        return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
    }
}
