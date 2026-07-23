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

        // 2. Fetch Form Configuration
        let form: any = null;
        if (formId) {
            try {
                // @ts-ignore
                const forms = await prisma.$queryRaw`
                    SELECT * FROM web_forms 
                    WHERE id = ${formId}::uuid AND status = 'active'
                    LIMIT 1
                `;
                // @ts-ignore
                if (forms && forms.length > 0) {
                    // @ts-ignore
                    form = forms[0];
                }
            } catch (dbError) {
                console.log("DEBUG: web_forms query failed or empty, using fallback");
            }
        }

        let organizationId: string;
        let tags: string[] = ["Web Lead"];
        let source: string = "Web Form";
        let redirectUrl: string | null = null;
        let fieldMapping: Record<string, string> = {};
        const formName = form ? form.name : "Public Web Form";

        if (form) {
            organizationId = form.organizationId;
            tags = ["Web Lead", form.name];
            source = form.source || "Web Form";
            redirectUrl = form.redirectUrl;
            fieldMapping = (form.config as Record<string, string>) || {};
        } else {
            const firstOrg = await prisma.organization.findFirst();
            if (!firstOrg) {
                return NextResponse.json({ error: "No organization configured in CRM" }, { status: 400 });
            }
            organizationId = firstOrg.id;
            tags = ["Web Lead", "Public Sign-Up"];
            source = "Landing Page";
        }

        // 6. Map Fields
        const contactData: Record<string, any> = {
            organizationId,
            tags,
            source,
            customFields: {
                status: "New"
            }
        };

        const basicFields = ["first_name", "last_name", "email", "phone", "company", "job_title", "first", "last", "message"];

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
                    let camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                    if (camelField === "first") camelField = "firstName";
                    if (camelField === "last") camelField = "lastName";
                    if (camelField === "message") {
                        contactData.customFields = {
                            ...contactData.customFields,
                            message: val
                        };
                    } else {
                        contactData[camelField] = val;
                    }
                }
            });
        }

        // Support firstName/lastName direct parameters
        if (body.firstName) contactData.firstName = body.firstName;
        if (body.lastName) contactData.lastName = body.lastName;
        if (!contactData.firstName) {
            contactData.firstName = body.name || body.fullName || "Anonymous";
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
                organizationId,
                role: { in: ["admin", "manager"] }
            },
            select: { userId: true }
        });

        if (admins.length > 0) {
            const notifs = admins.map(a => ({
                userId: a.userId,
                title: "New Web Lead",
                message: `${contact.firstName} ${contact.lastName || ""} from ${formName}`,
                type: "lead",
                linkUrl: `/dashboard/contacts/${contact.id}`
            }));

            await prisma.notification.createMany({
                data: notifs
            });
        }

        // 9. Trigger Automation
        try {
            const { evaluateTriggers } = require("@/lib/automations/engine");
            await evaluateTriggers("lead_created", organizationId, {
                contactId: contact.id,
                formId: form?.id || "default",
                ...body
            });
        } catch (autoError) {
            console.error("Failed to trigger automation:", autoError);
        }

        // 10. Response / Redirect
        if (redirectUrl) {
            return NextResponse.redirect(new URL(redirectUrl), 302);
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
