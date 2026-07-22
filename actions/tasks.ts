"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Task } from "@/types";
import { Prisma } from "@prisma/client";

export async function getTasks(filters?: {
    status?: string | "all";
    priority?: string | "all";
    assigned_to?: string | "all";
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const tasks = await prisma.$queryRaw`
        SELECT 
            t.*,
            json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as assigned_to,
            json_build_object('id', c.id, 'first_name', c.first_name, 'last_name', c.last_name) as contact,
            json_build_object('id', d.id, 'name', d.name) as deal
        FROM tasks t
        LEFT JOIN profiles p ON t.assigned_to = p.id
        LEFT JOIN contacts c ON t.contact_id = c.id
        LEFT JOIN deals d ON t.deal_id = d.id
        WHERE 
            (${filters?.status && filters.status !== "all" ? Prisma.sql`t.status = ${filters.status}` : Prisma.sql`1=1`})
            AND (${filters?.priority && filters.priority !== "all" ? Prisma.sql`t.priority = ${filters.priority}` : Prisma.sql`1=1`})
            AND (${filters?.assigned_to && filters.assigned_to !== "all" ? Prisma.sql`t.assigned_to = CAST(${filters.assigned_to} AS UUID)` : Prisma.sql`1=1`})
        ORDER BY t.due_date ASC
    `;

    return tasks as Task[];
}

export async function createTask(newTask: Partial<Task>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(newTask)) {
        if (value !== undefined) {
            columns.push(Prisma.raw(key));
            if (key === 'organization_id' || key === 'assigned_to' || key === 'contact_id' || key === 'deal_id' || key === 'created_by') {
                values.push(Prisma.sql`CAST(${value} AS UUID)`);
            } else if (key === 'due_date') {
                values.push(Prisma.sql`CAST(${value} AS TIMESTAMPTZ)`);
            } else {
                values.push(value);
            }
        }
    }
    
    // Add defaults
    if (!newTask.created_by) {
        columns.push(Prisma.raw('created_by'));
        values.push(Prisma.sql`CAST(${session.user.id} AS UUID)`);
    }

    const result = await prisma.$queryRaw`
        INSERT INTO tasks (${Prisma.join(columns, ', ')})
        VALUES (${Prisma.join(values, ', ')})
        RETURNING *
    `;
    
    return result;
}

export async function updateTask(id: string, updates: Partial<Task>) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const setClauses = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id') {
            if (key === 'organization_id' || key === 'assigned_to' || key === 'contact_id' || key === 'deal_id' || key === 'created_by') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS UUID)`);
            } else if (key === 'due_date') {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = CAST(${value} AS TIMESTAMPTZ)`);
            } else {
                setClauses.push(Prisma.sql`${Prisma.raw(key)} = ${value}`);
            }
        }
    }
    
    setClauses.push(Prisma.sql`updated_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)`);

    const result = await prisma.$queryRaw`
        UPDATE tasks
        SET ${Prisma.join(setClauses, ', ')}
        WHERE id = CAST(${id} AS UUID)
        RETURNING *
    `;
    
    return result;
}

export async function deleteTask(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        DELETE FROM tasks
        WHERE id = CAST(${id} AS UUID)
    `;
}
