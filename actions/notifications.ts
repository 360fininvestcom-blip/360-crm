"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export async function getNotifications(limit: number = 50) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const notifications = await prisma.$queryRaw`
        SELECT * FROM notifications 
        WHERE user_id = CAST(${session.user.id} AS UUID)
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;

    return notifications as any[];
}

export async function markNotificationAsRead(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        UPDATE notifications 
        SET is_read = true 
        WHERE id = CAST(${id} AS UUID) 
        AND user_id = CAST(${session.user.id} AS UUID)
    `;
}

export async function markAllNotificationsAsRead() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = CAST(${session.user.id} AS UUID)
        AND is_read = false
    `;
}

export async function clearAllNotifications() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.$executeRaw`
        DELETE FROM notifications 
        WHERE user_id = CAST(${session.user.id} AS UUID)
    `;
}
