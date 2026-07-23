import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
// Better Auth does not expose a server-side admin create user easily right now without session.
// We'll create the user directly in DB or throw "Not Implemented for Better Auth" if complex.
// For now, let's just insert directly into the database using Prisma and a simple hash 
// (assuming Better Auth uses standard bcrypt if configured so, or we can use the plugin later).

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = body.email;
        const password = body.password;
        const full_name = body.full_name || body.fullName;
        const role = body.role;
        const phone = body.phone;
        const organization_id = body.organization_id || body.organizationId;

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

        // Step 1: Create the user via Better Auth native API so password hashing matches Better Auth expectations
        const authUser = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: full_name
            }
        });

        if (!authUser || !authUser.user) {
            throw new Error("Failed to create user via authentication provider");
        }

        // Step 2: Create the associated Profile for this user
        const newProfile = await prisma.profile.create({
            data: {
                userId: authUser.user.id,
                organizationId: organization_id,
                fullName: full_name,
                email: email,
                role: role,
            }
        });

        return NextResponse.json({
            success: true,
            userId: authUser.user.id,
            profileId: newProfile.id,
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
