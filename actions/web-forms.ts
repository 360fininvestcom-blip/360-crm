"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export async function getWebForms() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const forms = await prisma.$queryRaw`
        SELECT * FROM web_forms
        WHERE organization_id = CAST(${session.user.organizationId} AS UUID)
        ORDER BY created_at DESC
    `;
    
    return forms as any[];
}

export async function createWebForm(name: string, source: string, overrides: Record<string, any> = {}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const config = { email: "email", name: "first_name" };

    const description = overrides.description || '';
    const submitText = overrides.submit_button_text || 'Submit';
    const successMsg = overrides.success_message || 'Thank you!';

    const result = await prisma.$queryRaw`
        INSERT INTO web_forms (organization_id, name, source, status, config, description, submit_button_text, success_message)
        VALUES (
            CAST(${session.user.organizationId} AS UUID),
            ${name},
            ${source},
            'active',
            ${config}::jsonb,
            ${description},
            ${submitText},
            ${successMsg}
        )
        RETURNING *
    `;

    // @ts-ignore
    return result[0];
}

export async function updateWebForm(id: string, payload: Record<string, any>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    // Dynamic update is tricky with queryRaw, but we only have a few fields
    const name = payload.name;
    const description = payload.description || '';
    const submitText = payload.submit_button_text || 'Submit';
    const successMsg = payload.success_message || 'Thank you!';

    const result = await prisma.$queryRaw`
        UPDATE web_forms 
        SET 
            name = ${name},
            description = ${description},
            submit_button_text = ${submitText},
            success_message = ${successMsg}
        WHERE id = CAST(${id} AS UUID)
        AND organization_id = CAST(${session.user.organizationId} AS UUID)
        RETURNING *
    `;

    // @ts-ignore
    return result[0];
}

export async function deleteWebForm(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        DELETE FROM web_forms
        WHERE id = CAST(${id} AS UUID)
        AND organization_id = CAST(${session.user.organizationId} AS UUID)
    `;
}
