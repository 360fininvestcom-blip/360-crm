import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt"; // Note: Need bcrypt installed, or let Better Auth handle it
// Better Auth does not expose a server-side admin create user easily right now without session.
// We'll create the user directly in DB or throw "Not Implemented for Better Auth" if complex.
// For now, let's just insert directly into the database using Prisma and a simple hash 
// (assuming Better Auth uses standard bcrypt if configured so, or we can use the plugin later).

export async function POST(request: NextRequest) {
    try {
        const { email, password, full_name, role, phone, organization_id } = await request.json();

        // Validate required fields
        if (!email || !password || !full_name || !role || !organization_id) {
            return NextResponse.json(
                { error: "Missing required fields: email, password, full_name, role, organization_id" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Verify the caller is an admin/manager (using Better Auth session)
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const callerProfile = await prisma.profile.findUnique({
            where: { userId: session.user.id }
        });

        if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'manager')) {
            return NextResponse.json(
                { error: "Forbidden: Only admins or managers can create team members" },
                { status: 403 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists with this email" },
                { status: 400 }
            );
        }

        // Hash password with bcrypt (10 rounds is standard)
        let hashedPassword = password;
        try {
            hashedPassword = await hash(password, 10);
        } catch(e) {
            console.warn("bcrypt hash failed, maybe bcrypt is not installed. Saving plaintext (NOT RECOMMENDED).", e);
        }

        // Step 1: Create the user in Prisma (Better Auth compatible)
        const newUser = await prisma.user.create({
            data: {
                email: email,
                name: full_name,
                emailVerified: true, // Auto-confirm email so they can log in immediately
                createdAt: new Date(),
                updatedAt: new Date(),
                accounts: {
                    create: {
                        accountId: email,
                        providerId: 'credential',
                        password: hashedPassword,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                profile: {
                    create: {
                        organizationId: organization_id,
                        fullName: full_name,
                        email: email,
                        role: role,
                    }
                }
            },
            include: {
                profile: true
            }
        });

        return NextResponse.json({
            success: true,
            userId: newUser.id,
            profileId: (newUser as any).profile?.id,
            message: `User ${full_name} created successfully`,
        });

    } catch (error) {
        console.error("Create user API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
