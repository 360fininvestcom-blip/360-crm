import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { validateApiKey, ApiContext } from "@/lib/api-middleware";
import { evaluateTriggers } from "@/lib/automations/engine";
import { z } from "zod";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const validation = await validateApiKey(request);
    if (validation instanceof NextResponse) return validation;
    const { organization_id } = validation as ApiContext;

    const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM contacts 
        WHERE organization_id = CAST(${organization_id} AS UUID)
    ` as any[];
    
    const count = Number(countResult[0]?.count || 0);

    const data = await prisma.$queryRaw`
        SELECT * 
        FROM contacts 
        WHERE organization_id = CAST(${organization_id} AS UUID)
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
    `;

    return NextResponse.json({
        data,
        meta: {
            page,
            limit,
            total: count
        }
    });
}

// Schema for Contact Creation
const CONTACT_SCHEMA = z.object({
    first_name: z.string().min(1),
    last_name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    company: z.string().optional(),
});

export async function POST(request: Request) {
    const validation = await validateApiKey(request);
    if (validation instanceof NextResponse) return validation;
    const { organization_id } = validation as ApiContext;

    try {
        const json = await request.json();
        const body = CONTACT_SCHEMA.parse(json);
        const inserted = await prisma.$queryRaw`
            INSERT INTO contacts (
                organization_id, first_name, last_name, email, phone, company, source
            ) VALUES (
                CAST(${organization_id} AS UUID),
                ${body.first_name},
                ${body.last_name || null},
                ${body.email || null},
                ${body.phone || null},
                ${body.company || null},
                'API'
            )
            RETURNING *
        ` as any[];
        
        const data = inserted[0];

        // Fire Automation Engine Triggers for the newly created lead
        await evaluateTriggers('contact_created', organization_id, {
            contactId: data.id,
            source: 'API'
        });

        return NextResponse.json({ data }, { status: 201 });

    } catch (e: unknown) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: e.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
}
