"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Deal, Pipeline, Task, Activity, DealNote } from "@/types";

async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function fetchDeals(pipelineId?: string): Promise<Deal[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const where: any = {};
    if (pipelineId && pipelineId !== 'all') {
        where.pipelineId = pipelineId;
    }

    const data = await prisma.deal.findMany({
        where,
        include: {
            contact: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });
    
    return data as unknown as Deal[];
}

export async function fetchPipelines(): Promise<Pipeline[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.pipeline.findMany({
        orderBy: { createdAt: "asc" }
    });
    return data as unknown as Pipeline[];
}

export async function fetchActivities(limit = 20): Promise<Activity[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.activity.findMany({
        include: {
            createdByProfile: {
                select: { id: true, fullName: true, avatarUrl: true }
            }
        },
        orderBy: { createdAt: "desc" },
        take: limit
    });
    return data as unknown as Activity[];
}

export async function fetchTasks(status?: string): Promise<Task[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const where: any = {};
    if (status) {
        where.status = status;
    }

    const data = await prisma.task.findMany({
        where,
        include: {
            assignedToProfile: {
                select: { id: true, fullName: true, avatarUrl: true }
            },
            contact: {
                select: { id: true, firstName: true, lastName: true }
            }
        },
        orderBy: { dueDate: "asc" }
    });
    return data as unknown as Task[];
}

export async function fetchDealStats(profileId?: string, isAdmin?: boolean): Promise<{ activeCount: number, totalRevenue: number }> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const where: any = {};
    if (!isAdmin && profileId) {
        where.ownerId = profileId;
    }

    const data = await prisma.deal.findMany({
        where,
        select: { stage: true, value: true }
    });

    const activeCount = data.filter(d => d.stage !== "closed" && d.stage !== "lost").length;
    // Assuming value is Decimal, convert to number
    const totalRevenue = data.reduce((acc, deal) => acc + (deal.stage === "closed" ? Number(deal.value) : 0), 0);

    return { activeCount, totalRevenue };
}

export async function createDeal(deal: Omit<Deal, "id" | "created_at" | "updated_at">) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return (await prisma.deal.create({
        data: deal as any
    })) as unknown as Deal;
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return (await prisma.deal.update({
        where: { id },
        data: updates as any
    })) as unknown as Deal;
}

export async function deleteDeal(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.deal.delete({
        where: { id }
    });
}

export async function createPipeline(pipeline: Omit<Pipeline, "id" | "created_at">) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return (await prisma.pipeline.create({
        data: pipeline as any
    })) as unknown as Pipeline;
}

export async function updatePipeline(id: string, updates: Partial<Pipeline>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return (await prisma.pipeline.update({
        where: { id },
        data: updates as any
    })) as unknown as Pipeline;
}

export async function deletePipeline(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.pipeline.delete({
        where: { id }
    });
}

export async function fetchDealNotes(dealId: string): Promise<DealNote[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.dealNote.findMany({
        where: { dealId },
        include: {
            author: {
                select: { fullName: true, avatarUrl: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });
    return data as unknown as DealNote[];
}

export async function createDealNote(note: { dealId: string; authorId: string; content: string }) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return await prisma.dealNote.create({
        data: note as any
    });
}

export async function deleteDealNote(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.dealNote.delete({
        where: { id }
    });
}
