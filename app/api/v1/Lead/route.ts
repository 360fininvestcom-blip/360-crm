import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { evaluateTriggers } from "@/lib/automations/engine";
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/Lead
 * Creates a new lead (contact) from external platform
 */
export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get("X-Api-Key");
        const orgId = await validateApiKey(apiKey);

        if (!orgId) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        const body = await request.json();
        
        // Map fields from EspoCRM style / Generic API style
        const firstName = body.firstName || body.first_name;
        const lastName = body.lastName || body.last_name || "";
        const email = body.emailAddress || body.email;
        const phone = body.phoneNumber || body.phone || "";

        if (!firstName || !email) {
            return NextResponse.json({ error: "Missing required fields: firstName and emailAddress (or email) are required" }, { status: 400 });
        }

        const status = body.status || "new";
        
        // We use Prisma to insert the contact
        const contact = await prisma.contact.create({
            data: {
                organizationId: orgId,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                status: status,
                source: "API Integration",
                tags: ["External API"],
            }
        });

        // Trigger Automations
        try {
            // Trigger both 'lead_created' (Specific legacy) and 'contact_created' (Standard)
            await evaluateTriggers("lead_created", orgId, {
                contactId: contact.id,
                ...body
            });
            
            await evaluateTriggers("contact_created", orgId, {
                contactId: contact.id,
                ...body
            });
        } catch (autoError) {
            console.error("Automation Trigger Error:", autoError);
        }

        return NextResponse.json({ 
            success: true, 
            id: contact.id,
            message: "Lead created successfully" 
        }, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/v1/Lead Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * GET /api/v1/Lead
 * Pulls leads based on date filters (EspoCRM style)
 */
export async function GET(request: Request) {
    try {
        const apiKey = request.headers.get("X-Api-Key");
        const orgId = await validateApiKey(apiKey);

        if (!orgId) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Parse EspoCRM-style "where" filters
        let i = 0;
        const filtersFound: { field: string; type: string; value: string }[] = [];
        
        // We use a safe loop to find all where[i] patterns
        while (searchParams.has(`where[${i}][field]`)) {
            const field = searchParams.get(`where[${i}][field]`);
            const type = searchParams.get(`where[${i}][type]`);
            const value = searchParams.get(`where[${i}][value]`);
            
            if (field && type && value) {
                filtersFound.push({ field, type, value });
            }
            i++;
            if (i > 20) break; // Safety break
        }

        let whereClause: Prisma.ContactWhereInput = {
            organizationId: orgId
        };

        for (const filter of filtersFound) {
            const { field, type, value } = filter;
            
            let dbField = field;
            if (field === "createdAt") dbField = "createdAt";
            if (field === "firstName") dbField = "firstName";
            if (field === "lastName") dbField = "lastName";
            if (field === "emailAddress") dbField = "email";
            if (field === "phoneNumber") dbField = "phone";

            if (type === "after") {
                whereClause[dbField as keyof Prisma.ContactWhereInput] = { gte: new Date(value) } as any;
            } else if (type === "before") {
                whereClause[dbField as keyof Prisma.ContactWhereInput] = { lte: new Date(value) } as any;
            } else if (type === "equals") {
                // @ts-ignore
                whereClause[dbField as keyof Prisma.ContactWhereInput] = value;
            } else if (type === "contains") {
                whereClause[dbField as keyof Prisma.ContactWhereInput] = { contains: value, mode: 'insensitive' } as any;
            }
        }

        const contacts = await prisma.contact.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map fields back to Espo style
        const espoContacts = contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            emailAddress: c.email,
            phoneNumber: c.phone,
            status: c.status,
            createdAt: c.createdAt
        }));

        return NextResponse.json({
            total: espoContacts.length,
            list: espoContacts
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/v1/Lead Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
