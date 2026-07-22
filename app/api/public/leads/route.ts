import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // 1. Validate Form ID (Header or Body)
        const headersObj = Object.fromEntries(
            Array.from(request.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
        );
        let formId = headersObj["x-form-id"];
        const contentType = headersObj["content-type"];

        console.log("DEBUG: formId from headers:", formId);
        console.log("DEBUG: contentType:", contentType);

        let body: Record<string, any> = {};

        if (!formId) {
            // Check body for x-form-id (standard HTML forms)
            if (contentType?.includes("application/x-www-form-urlencoded") || contentType?.includes("multipart/form-data")) {
                const formData = await request.formData();
                formId = formData.get("x-form-id") as string;
                body = Object.fromEntries(formData.entries());
                console.log("DEBUG: formId from formData:", formId);
            } else if (contentType?.includes("application/json")) {
                body = await request.clone().json();
                formId = body["x-form-id"];
                console.log("DEBUG: formId from JSON body:", formId);
            }
        } else {
            if (contentType?.includes("application/json")) {
                body = await request.json();
            } else if (contentType?.includes("application/x-www-form-urlencoded") || contentType?.includes("multipart/form-data")) {
                const formData = await request.formData();
                body = Object.fromEntries(formData.entries());
            }
        }

        if (!formId) {
            console.log("DEBUG: Returning 400 - missing formId");
            return NextResponse.json({ error: "Missing Form ID" }, { status: 400 });
        }

        // 2. Fetch Form Configuration
        const form = await prisma.webForm.findFirst({
            where: {
                id: formId,
                status: "active"
            }
        });

        if (!form) {
            return NextResponse.json(
                { error: "Invalid form ID or form is inactive" },
                { status: 404 }
            );
        }

        // 6. Map Fields
        const fieldMapping = (form.config as Record<string, string>) || {};
        const contactData: Record<string, any> = {
            organizationId: form.organizationId,
            tags: ["Web Lead", form.name],
            source: form.source || "Web Form",
            customFields: {
                status: "New"
            }
        };

        const basicFields = ["first_name", "last_name", "email", "phone", "company", "job_title"];

        // Explicit mapping
        Object.entries(fieldMapping).forEach(([formField, dbField]) => {
            if (body[formField]) {
                const camelField = dbField.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                contactData[camelField] = body[formField];
            }
        });

        // Fallback: If no mapping, try direct match
        if (Object.keys(fieldMapping).length === 0) {
            basicFields.forEach(field => {
                const val = body[field] || body[field.replace('_', '')] || body[field.replace('_', ' ')];
                if (val) {
                    const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                    contactData[camelField] = val;
                }
            });
        }

        // 7. Insert Contact
        let contact;
        try {
            contact = await prisma.contact.create({
                data: contactData as any
            });
        } catch (insertError: any) {
            console.error("Web Lead Insert Error:", insertError);
            return NextResponse.json(
                { error: `Failed to process lead: ${insertError.message}` },
                { status: 500 }
            );
        }

        // 8. Create Notification for Admins
        const admins = await prisma.profile.findMany({
            where: {
                organizationId: form.organizationId,
                role: { in: ["admin", "manager"] }
            },
            select: { userId: true }
        });

        if (admins.length > 0) {
            const notifs = admins.map(a => ({
                organizationId: form.organizationId,
                userId: a.userId,
                title: "New Web Lead",
                message: `${contact.firstName} ${contact.lastName || ""} from ${form.name}`,
                type: "lead",
                link: `/dashboard/contacts/${contact.id}`
            }));
            await prisma.notification.createMany({
                data: notifs as any
            });
        }

        // 9. Trigger Automation
        try {
            const { evaluateTriggers } = require("@/lib/automations/engine");
            await evaluateTriggers("lead_created", form.organizationId, {
                contactId: contact.id,
                formId: form.id,
                ...body
            });
        } catch (autoError) {
            console.error("Failed to trigger automation:", autoError);
        }

        // 10. Response / Redirect
        if (form.redirectUrl) {
            return NextResponse.redirect(new URL(form.redirectUrl), 302);
        }

        return NextResponse.json({ success: true, id: contact.id }, { status: 200 });

    } catch (error: unknown) {
        console.error("Web Lead API Error:", error);
        const err = error as any;
        return NextResponse.json(
            {
                error: (err?.message || "Internal Server Error"),
                stack: err?.stack,
                details: JSON.stringify(err, Object.getOwnPropertyNames(err))
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Form-ID",
        },
    });
}
