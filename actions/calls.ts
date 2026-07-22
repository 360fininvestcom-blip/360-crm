"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { CallLog } from "@/types";
import { Prisma } from "@prisma/client";

export async function getCallLogs(limit = 50, contactId?: string): Promise<CallLog[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    let whereClause = Prisma.sql`user_id = CAST(${session.user.id} AS UUID)`;
    
    if (contactId) {
        whereClause = Prisma.sql`${whereClause} AND contact_id = CAST(${contactId} AS UUID)`;
    }

    const logs = await prisma.$queryRaw`
        SELECT 
            cl.*,
            json_build_object('id', c.id, 'first_name', c.first_name, 'last_name', c.last_name, 'phone', c.phone) as contact,
            json_build_object('id', p.id, 'full_name', p.full_name) as user
        FROM call_logs cl
        LEFT JOIN contacts c ON cl.contact_id = c.id
        LEFT JOIN profiles p ON cl.user_id = p.id
        WHERE ${whereClause}
        ORDER BY cl.started_at DESC
        LIMIT ${limit}
    `;

    return logs as CallLog[];
}

export async function createCallLog(arg: Omit<CallLog, "id" | "created_at">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(arg)) {
        if (value !== undefined) {
            columns.push(Prisma.raw(key));
            if (key === 'organization_id' || key === 'user_id' || key === 'contact_id') {
                values.push(Prisma.sql`CAST(${value} AS UUID)`);
            } else if (key === 'started_at' || key === 'ended_at') {
                values.push(Prisma.sql`CAST(${value} AS TIMESTAMPTZ)`);
            } else {
                values.push(value);
            }
        }
    }

    if (!arg.started_at) {
        columns.push(Prisma.raw('started_at'));
        values.push(Prisma.sql`CAST(${new Date().toISOString()} AS TIMESTAMPTZ)`);
    }
    
    if (!arg.user_id) {
        columns.push(Prisma.raw('user_id'));
        values.push(Prisma.sql`CAST(${session.user.id} AS UUID)`);
    }

    const result = await prisma.$queryRaw`
        INSERT INTO call_logs (${Prisma.join(columns, ', ')})
        VALUES (${Prisma.join(values, ', ')})
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0] as CallLog;
}
