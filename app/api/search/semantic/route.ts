import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getActiveAIProvider, generateEmbedding } from "@/lib/ai-services";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json({ error: "Missing query" }, { status: 400 });
        }

        // Fetch user context
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { organizationId: true }
        });

        if (!profile || !profile.organizationId) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const keys = await getActiveAIProvider(profile.organizationId);
        if (!keys) return NextResponse.json({ error: "AI provider not configured" }, { status: 400 });

        // 1. Generate Embedding for the query
        const queryEmbedding = await generateEmbedding(query, keys);
        if (!queryEmbedding) return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });

        // Format embedding as string for postgres vector
        const embeddingString = `[${queryEmbedding.join(',')}]`;

        // 2. Search using Prisma raw query for pgvector
        const contacts = await prisma.$queryRaw`
            SELECT id, first_name as "firstName", last_name as "lastName", email, job_title as "jobTitle", company,
                   1 - (embedding <=> ${embeddingString}::vector) as similarity
            FROM contacts
            WHERE organization_id = CAST(${profile.organizationId} AS UUID)
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> ${embeddingString}::vector) > 0.5
            ORDER BY similarity DESC
            LIMIT 5;
        `;

        const deals = await prisma.$queryRaw`
            SELECT id, name, value, stage,
                   1 - (embedding <=> ${embeddingString}::vector) as similarity
            FROM deals
            WHERE organization_id = CAST(${profile.organizationId} AS UUID)
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> ${embeddingString}::vector) > 0.5
            ORDER BY similarity DESC
            LIMIT 5;
        `;

        return NextResponse.json({
            results: {
                contacts: contacts || [],
                deals: deals || []
            }
        });

    } catch (error) {
        console.error("[Semantic Search] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
