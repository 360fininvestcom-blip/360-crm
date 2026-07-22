"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { AutomationRule } from "@/types";
import { Prisma } from "@prisma/client";

export async function createAutomationRule(arg: Omit<AutomationRule, "id" | "created_at" | "updated_at">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(arg)) {
        if (value !== undefined) {
            columns.push(Prisma.raw(key));
            if (key === 'organization_id') {
                values.push(Prisma.sql`CAST(${value} AS UUID)`);
            } else if (key === 'conditions' || key === 'actions') {
                values.push(Prisma.sql`${value}::jsonb`);
            } else {
                values.push(value);
            }
        }
    }

    const result = await prisma.$queryRaw`
        INSERT INTO automation_rules (${Prisma.join(columns, ', ')})
        VALUES (${Prisma.join(values, ', ')})
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0];
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const setClauses = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id') {
            if (key === 'organization_id') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS UUID)`);
            } else if (key === 'conditions' || key === 'actions') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}::jsonb`);
            } else {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
            }
        }
    }
    setClauses.push(Prisma.sql`updated_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)`);

    const result = await prisma.$queryRaw`
        UPDATE automation_rules
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = CAST(${id} AS UUID)
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0];
}

export async function deleteAutomationRule(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        DELETE FROM automation_rules
        WHERE id = CAST(${id} AS UUID)
    `;
}

export async function toggleAutomationRule(id: string, is_active: boolean) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const result = await prisma.$queryRaw`
        UPDATE automation_rules
        SET is_active = ${is_active}, updated_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
        WHERE id = CAST(${id} AS UUID)
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0];
}
