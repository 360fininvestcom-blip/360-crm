import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export interface ApiContext {
    organization_id: string;
    scopes: string[];
}

export async function validateApiKey(request: Request): Promise<ApiContext | NextResponse> {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
        return NextResponse.json(
            { error: "Missing X-API-Key header" },
            { status: 401 }
        );
    }

    // Hash the provided key to compare with stored hash
    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    const keyRecords: any[] = await prisma.$queryRaw`
        SELECT * FROM organization_api_keys
        WHERE key_hash = ${keyHash} AND is_active = true
        LIMIT 1
    `;

    if (keyRecords.length === 0) {
        return NextResponse.json(
            { error: "Invalid or inactive API Key" },
            { status: 401 }
        );
    }

    const keyRecord = keyRecords[0];

    // Update last_used_at (async, fire & forget to not block)
    // In a real app we might use a queue or ensure this doesn't slow down the request significantly
    // For now we await it to be safe or use supabase.rpc if available
    await prisma.$executeRaw`
        UPDATE organization_api_keys
        SET last_used_at = CAST(${new Date().toISOString()} AS TIMESTAMPTZ)
        WHERE id = CAST(${keyRecord.id} AS UUID)
    `;

    return {
        organization_id: keyRecord.organization_id,
        scopes: keyRecord.scopes || []
    };
}
