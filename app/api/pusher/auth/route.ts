import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const socketId = data.get("socket_id") as string;
        const channel = data.get("channel_name") as string;

        // Verify authentication using Better Auth
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch user profile for presence data
        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { id: true, fullName: true, email: true, avatarUrl: true }
        });

        if (!profile) {
            return new NextResponse("Profile not found", { status: 404 });
        }

        const presenceData = {
            user_id: session.user.id,
            user_info: {
                profile_id: profile.id,
                email: profile.email,
                full_name: profile.fullName || 'Unknown User',
                avatar_url: profile.avatarUrl,
                last_seen: new Date().toISOString(),
                current_path: "", // Passed from client typically, but default to empty
            },
        };

        const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
        return NextResponse.json(authResponse);
    } catch (error) {
        console.error("Pusher auth error:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
