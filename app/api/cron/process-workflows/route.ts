import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processWorkflowRun } from '@/lib/automations/engine';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic security block if triggered manually, but primarily meant to be invoked by Vercel Cron securely
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // 1. Find all workflow runs that are 'waiting' (paused on a delay node)
        // AND whose resume timestamp has tipped into the past
        const now = new Date().toISOString();
        const pendingRuns: { id: string }[] = await prisma.$queryRaw`
            SELECT id FROM workflow_runs
            WHERE status = 'waiting'
              AND next_execution_at <= CAST(${now} AS TIMESTAMPTZ)
            ORDER BY next_execution_at ASC
            LIMIT 50
        `;

        if (!pendingRuns || pendingRuns.length === 0) {
            return NextResponse.json({ message: 'No pending workflows to process' });
        }

        // 2. Fire them up concurrently
        const runPromises = pendingRuns.map(run => processWorkflowRun(run.id, 0));
        
        // Wait for all to finish (engine.ts recursively calls itself sequentially per node, 
        // so this awaits the entire remainder of the drip campaign for each contact, assuming it doesn't hit another delay)
        await Promise.allSettled(runPromises);

        return NextResponse.json({ 
            message: `Successfully processed ${pendingRuns.length} workflows`,
            processedCount: pendingRuns.length
        });
        
    } catch (error: any) {
        console.error('Cron process-workflows failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
