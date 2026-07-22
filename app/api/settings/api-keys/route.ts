import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const CREATE_KEY_SCHEMA = z.object({
    label: z.string().min(1),
    scopes: z.array(z.string()).default(["contacts:read", "contacts:write"]),
});

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's org role
        const profiles = await prisma.$queryRaw`
            SELECT organization_id, role FROM profiles
            WHERE user_id = CAST(${user.id} AS UUID)
            LIMIT 1
        ` as any[];
        
        const profile = profiles[0];

        if (!profile || !["admin", "manager"].includes(profile.role)) {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const json = await request.json();
        const { label, scopes } = CREATE_KEY_SCHEMA.parse(json);

        // Generate Key
        // Format: nk_live_<24_chars_random_hex>
        const randomPart = randomBytes(24).toString("hex");
        const apiKey = `nk_live_${randomPart}`;
        const keyHash = createHash("sha256").update(apiKey).digest("hex");
        const keyPrefix = apiKey.substring(0, 15); // "nk_live_" + 7 chars

        const inserted = await prisma.$queryRaw`
            INSERT INTO organization_api_keys (
                organization_id, label, scopes, key_hash, key_prefix, created_by
            ) VALUES (
                CAST(${profile.organization_id} AS UUID),
                ${label},
                ${scopes},
                ${keyHash},
                ${keyPrefix},
                CAST(${user.id} AS UUID)
            )
            RETURNING *
        ` as any[];
        
        const data = inserted[0];

        // RETURN THE RAW KEY ONLY ONCE
        return NextResponse.json({
            apiKey,
            id: data.id,
            label: data.label,
            key_prefix: data.key_prefix
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const user = session?.user;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await prisma.$executeRaw`
            DELETE FROM organization_api_keys
            WHERE id = CAST(${id} AS UUID)
            AND organization_id = CAST(${user.organizationId} AS UUID)
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
