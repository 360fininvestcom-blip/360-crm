import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { processWorkflowRun } from '@/lib/automations/engine';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Secret key check (optional but recommended for cron)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date().toISOString();
        
        // 1. Fetch runs due for processing
        const runs: any[] = await prisma.$queryRaw`
            SELECT id FROM workflow_runs
            WHERE status IN ('running', 'waiting')
              AND (next_execution_at <= CAST(${now} AS TIMESTAMPTZ) OR next_execution_at IS NULL)
            LIMIT 20
        `;

        if (!runs || runs.length === 0) {
            return NextResponse.json({ success: true, message: 'No runs to process' });
        }

        const results = [];

        for (const run of runs) {
            try {
                await processWorkflowRun(run.id);
                results.push({ id: run.id, status: 'processed' });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`Error processing run ${run.id}:`, message);
                results.push({ id: run.id, status: 'error', message });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Workflow processing failed:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
