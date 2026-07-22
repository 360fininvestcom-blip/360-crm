"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Workflow } from "@/types";
import { Prisma } from "@prisma/client";

export async function getWorkflows(): Promise<Workflow[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const workflows = await prisma.$queryRaw`
        SELECT * FROM workflows
        ORDER BY updated_at DESC
    `;
    return workflows as Workflow[];
}

export async function createWorkflow(arg: Omit<Workflow, "id" | "created_at" | "updated_at">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(arg)) {
        if (value !== undefined) {
            columns.push(Prisma.raw(key));
            if (key === 'organization_id') {
                values.push(Prisma.sql`CAST(${value} AS UUID)`);
            } else if (key === 'trigger_config' || key === 'actions') {
                values.push(Prisma.sql`${value}::jsonb`);
            } else {
                values.push(value);
            }
        }
    }

    const result = await prisma.$queryRaw`
        INSERT INTO workflows (${Prisma.join(columns, ', ')})
        VALUES (${Prisma.join(values, ', ')})
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0];
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const setClauses = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id') {
            if (key === 'organization_id') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS UUID)`);
            } else if (key === 'trigger_config' || key === 'actions') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}::jsonb`);
            } else {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
            }
        }
    }
    setClauses.push(Prisma.sql`updated_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)`);

    const result = await prisma.$queryRaw`
        UPDATE workflows
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = CAST(${id} AS UUID)
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0];
}

export async function deleteWorkflow(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        DELETE FROM workflows
        WHERE id = CAST(${id} AS UUID)
    `;
}

export async function getWorkflowLogs() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    // Fetch the logs (no organization_id on logs table yet usually, but we assume it's public for MVP or filter by workflow.org_id)
    // For now we'll just get the latest 50 logs as before.
    const logs = await prisma.$queryRaw`
        SELECT * FROM workflow_logs
        ORDER BY created_at DESC
        LIMIT 50
    `;
    
    return logs as any[];
}
