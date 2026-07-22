import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Notifications GET error:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id, readAll } = await req.json();

        if (readAll) {
            await prisma.notification.updateMany({
                where: { userId: session.user.id },
                data: { read: true }
            });
        } else if (id) {
            await prisma.notification.update({
                where: { id, userId: session.user.id },
                data: { read: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Notifications PATCH error:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
