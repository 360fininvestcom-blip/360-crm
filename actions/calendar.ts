"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { CalendarEvent } from "@/types";
import { Prisma } from "@prisma/client";

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const events = await prisma.$queryRaw`
        SELECT * FROM calendar_events
        ORDER BY start_time ASC
    `;

    return events as CalendarEvent[];
}

export async function createCalendarEvent(arg: Omit<CalendarEvent, "id" | "created_at" | "updated_at">) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(arg)) {
        if (value !== undefined) {
            columns.push(Prisma.raw(key));
            if (key === 'organization_id' || key === 'user_id' || key === 'deal_id' || key === 'contact_id') {
                values.push(Prisma.sql`CAST(${value} AS UUID)`);
            } else if (key === 'start_time' || key === 'end_time') {
                values.push(Prisma.sql`CAST(${value} AS TIMESTAMPTZ)`);
            } else {
                values.push(value);
            }
        }
    }

    const result = await prisma.$queryRaw`
        INSERT INTO calendar_events (${Prisma.join(columns, ', ')})
        VALUES (${Prisma.join(values, ', ')})
        RETURNING *
    `;
    
    // @ts-ignore
    return result[0] as CalendarEvent;
}
