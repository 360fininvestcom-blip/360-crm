"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { subDays, startOfDay, format } from 'date-fns';

export interface AnalyticsData {
    calls: {
        total: number;
        connected: number;
        averageDuration: number;
        volumeByDay: { name: string; calls: number; connected: number }[];
    };
    tasks: {
        total: number;
        completed: number;
        pending: number;
        distribution: { name: string; value: number; color: string }[];
    };
    deals: {
        totalValue: number;
        count: number;
        activeCount: number;
        weightedValue: number;
        wonValue: number;
        averageCloseTimeDays: number;
        funnel: { name: string; value: number }[];
    };
    leaderboard: {
        agentId: string;
        agentName: string;
        callsMade: number;
        dealsWon: number;
        revenueWon: number;
    }[];
}

export async function fetchAnalytics(ownerId?: string, days: number = 7, pipelineId?: string): Promise<AnalyticsData> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");
    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) throw new Error("No active profile");
    const organizationId = profile.organizationId;
    
    const orgId = organizationId;
    const today = new Date();
    const startDate = subDays(today, days - 1);

    // 1. Fetch Calls (Activities)
    let callsQuery = Prisma.sql`
        SELECT started_at, status, user_id, duration_seconds 
        FROM call_logs 
        WHERE started_at >= CAST(${startOfDay(startDate).toISOString()} AS TIMESTAMPTZ)
        AND organization_id = CAST(${orgId} AS UUID)
    `;
    if (ownerId) callsQuery = Prisma.sql`${callsQuery} AND created_by = CAST(${ownerId} AS UUID)`;
    
    const callsData = await prisma.$queryRaw(callsQuery) as any[];

    // Process Calls
    const volumeByDay = Array.from({ length: days }).map((_, i) => {
        const date = subDays(today, days - 1 - i);
        const dayStr = days <= 14 ? format(date, 'EEE') : format(date, 'MMM d');
        const dayCalls = callsData?.filter(c =>
            new Date(c.started_at).toDateString() === date.toDateString()
        ) || [];

        const connectedCalls = dayCalls.filter(c => c.status === 'completed');

        return {
            name: dayStr,
            calls: dayCalls.length,
            connected: connectedCalls.length
        };
    });

    const totalCalls = callsData?.length || 0;
    const totalConnected = callsData?.filter(c => c.status === 'completed').length || 0;
    const totalDuration = callsData?.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) || 0;
    const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // 2. Fetch Tasks
    let tasksQuery = Prisma.sql`
        SELECT status 
        FROM tasks 
        WHERE organization_id = CAST(${orgId} AS UUID)
    `;
    if (ownerId) tasksQuery = Prisma.sql`${tasksQuery} AND assigned_to_id = CAST(${ownerId} AS UUID)`;
    
    const tasksData = await prisma.$queryRaw(tasksQuery) as any[];

    const totalTasks = tasksData?.length || 0;
    const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
    const pendingTasks = tasksData?.filter(t => t.status === 'pending').length || 0;
    const inProgressTasks = tasksData?.filter(t => t.status === 'in_progress').length || 0;

    const taskDistribution = [
        { name: 'Completed', value: completedTasks, color: '#22c55e' },
        { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
        { name: 'Pending', value: pendingTasks, color: '#eab308' },
    ].filter(d => d.value > 0);

    // 3. Fetch Deals
    let dealsQuery = Prisma.sql`
        SELECT value, stage, probability, created_at, updated_at, owner_id, pipeline_id 
        FROM deals 
        WHERE organization_id = CAST(${orgId} AS UUID)
    `;
    if (ownerId) dealsQuery = Prisma.sql`${dealsQuery} AND owner_id = CAST(${ownerId} AS UUID)`;
    if (pipelineId && pipelineId !== 'all') dealsQuery = Prisma.sql`${dealsQuery} AND pipeline_id = CAST(${pipelineId} AS UUID)`;
    
    const dealsData = await prisma.$queryRaw(dealsQuery) as any[];

    // Calculate pipeline metrics
    const totalDealValue = dealsData.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const dealCount = dealsData.length;
    const activeCount = dealsData.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length;

    // Revenue forecasting
    const weightedValue = dealsData.reduce((acc, curr) => {
        if (curr.stage === 'closed_won' || curr.stage === 'closed_lost') return acc;
        return acc + ((Number(curr.value) || 0) * ((Number(curr.probability) || 0) / 100));
    }, 0);

    let totalCloseDays = 0;
    let wonCount = 0;

    const wonValue = dealsData.filter(d => d.stage === 'closed_won').reduce((acc, curr) => {
        wonCount++;
        if (curr.created_at && curr.updated_at) {
            const created = new Date(curr.created_at);
            const updated = new Date(curr.updated_at);
            const daysToClose = (updated.getTime() - created.getTime()) / (1000 * 3600 * 24);
            totalCloseDays += Math.max(0, daysToClose);
        }
        return acc + (Number(curr.value) || 0);
    }, 0);

    const averageCloseTimeDays = wonCount > 0 ? totalCloseDays / wonCount : 0;

    const stageCounts: Record<string, number> = {};
    dealsData.forEach(d => {
        const stage = d.stage || 'unknown';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    const funnel = Object.entries(stageCounts)
        .map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value }))
        .sort((a, b) => b.value - a.value);

    // 4. Fetch Profiles for Leaderboard
    const profilesData = await prisma.$queryRaw`
        SELECT id, full_name 
        FROM profiles 
        WHERE organization_id = CAST(${orgId} AS UUID)
    ` as any[];

    const leaderboardMap: Record<string, { callsMade: number, dealsWon: number, revenueWon: number }> = {};
    profilesData?.forEach(p => {
        leaderboardMap[p.id] = { callsMade: 0, dealsWon: 0, revenueWon: 0 };
    });

    callsData?.forEach(c => {
        const owner = c.user_id;
        if (owner && leaderboardMap[owner]) leaderboardMap[owner].callsMade++;
    });

    dealsData.forEach(d => {
        const owner = d.owner_id;
        if (owner && d.stage === 'closed_won' && leaderboardMap[owner]) {
            leaderboardMap[owner].dealsWon++;
            leaderboardMap[owner].revenueWon += (Number(d.value) || 0);
        }
    });

    const leaderboard = (profilesData || [])
        .map(p => ({
            agentId: p.id,
            agentName: p.full_name || 'Unknown Agent',
            ...leaderboardMap[p.id]
        }))
        .filter(l => l.callsMade > 0 || l.dealsWon > 0 || l.revenueWon > 0)
        .sort((a, b) => b.revenueWon - a.revenueWon || b.dealsWon - a.dealsWon);

    return {
        calls: {
            total: totalCalls,
            connected: totalConnected,
            averageDuration,
            volumeByDay
        },
        tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            distribution: taskDistribution
        },
        deals: {
            totalValue: totalDealValue,
            count: dealCount,
            activeCount,
            weightedValue,
            wonValue,
            averageCloseTimeDays,
            funnel
        },
        leaderboard
    };
}
