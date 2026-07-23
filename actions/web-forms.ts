"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getAuthProfile() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    if (!profile.organizationId) throw new Error("No organization associated with profile");
    return profile as typeof profile & { organizationId: string };
}

function mapWebForm(form: any) {
    let schemaArray: any[] = [];
    try {
        if (form.config && typeof form.config === "object") {
            schemaArray = Object.entries(form.config).map(([name, type]) => ({
                name,
                type,
                label: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                required: true
            }));
        }
    } catch (e) {
        console.error("Failed to parse schema config:", e);
    }

    return {
        id: form.id,
        organization_id: form.organizationId,
        name: form.name,
        description: form.description || "",
        source: form.source || "Web Form",
        status: (form.status || "active") as "active" | "inactive",
        config: (form.config || {}) as Record<string, string>,
        redirect_url: form.redirectUrl || null,
        submit_button_text: form.submitButtonText || "Submit",
        success_message: form.successMessage || "Thank you for your submission!",
        is_active: form.isActive ?? true,
        created_at: form.createdAt.toISOString(),
        schema: schemaArray
    };
}

export async function getWebForms() {
    try {
        const profile = await getAuthProfile();
        const forms = await prisma.webForm.findMany({
            where: { organizationId: profile.organizationId },
            orderBy: { createdAt: "desc" }
        });
        return forms.map(mapWebForm);
    } catch (error) {
        console.error("Failed to get web forms:", error);
        return [];
    }
}

export async function createWebForm(name: string, source: string, overrides: Record<string, any> = {}) {
    const profile = await getAuthProfile();

    const config = { email: "email", name: "first_name" };
    const description = overrides.description || '';
    const submitText = overrides.submit_button_text || 'Submit';
    const successMsg = overrides.success_message || 'Thank you!';

    const form = await prisma.webForm.create({
        data: {
            organizationId: profile.organizationId,
            name,
            source,
            status: "active",
            config,
            description,
            submitButtonText: submitText,
            successMessage: successMsg,
            isActive: true
        }
    });

    return mapWebForm(form);
}

export async function updateWebForm(id: string, payload: Record<string, any>) {
    const profile = await getAuthProfile();

    const name = payload.name;
    const description = payload.description || '';
    const submitText = payload.submit_button_text || 'Submit';
    const successMsg = payload.success_message || 'Thank you!';

    const form = await prisma.webForm.update({
        where: {
            id,
            organizationId: profile.organizationId
        },
        data: {
            name,
            description,
            submitButtonText: submitText,
            successMessage: successMsg
        }
    });

    return mapWebForm(form);
}

export async function deleteWebForm(id: string) {
    const profile = await getAuthProfile();

    await prisma.webForm.delete({
        where: {
            id,
            organizationId: profile.organizationId
        }
    });
    return { success: true };
}
