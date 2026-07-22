import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        // Verify the user is authenticated
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = session.user;

        // Delete the user from Prisma
        // This will trigger database cascades for the profile and related data
        await prisma.user.delete({
            where: { id: user.id }
        });

        // Return success and instructions to clear local state/redirect
        return NextResponse.json({
            success: true,
            message: "Account deleted successfully",
        });

    } catch (error) {
        console.error("Delete account API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
