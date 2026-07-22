"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { Deal, Pipeline, Task, Activity } from "@/types";
import {
    fetchDeals,
    fetchPipelines,
    fetchActivities,
    fetchTasks,
    fetchDealStats,
    createDeal,
    updateDeal,
    deleteDeal,
    createPipeline,
    updatePipeline,
    deletePipeline
} from "@/app/actions/deals";

// ============================================
// TYPES
// ============================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    stage?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// SWR HOOKS
// ============================================

/**
 * Fetch all deals (legacy, no pagination)
 */
export function useDeals(pipelineId?: string) {
    const swr = useSWR<Deal[]>(
        pipelineId ? `deals-${pipelineId}` : "deals",
        () => fetchDeals(pipelineId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    const realtimeKey = useMemo(() => (key: unknown) =>
        typeof key === "string" && (key === "deals" || key.startsWith("deals-")),
        []);

    useRealtime("deals", realtimeKey);

    return swr;
}

export function usePipelines() {
    const swr = useSWR<Pipeline[]>("pipelines", fetchPipelines, {
        revalidateOnFocus: false,
    });

    useRealtime("pipelines", "pipelines");

    return swr;
}

export function useActivities(limit = 20) {
    const swr = useSWR<Activity[]>(
        `activities-${limit}`,
        () => fetchActivities(limit),
        { revalidateOnFocus: false }
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("activities-"), []);
    useRealtime("activities", realtimeKey);

    return swr;
}

export function useTasks(status?: string) {
    const swr = useSWR<Task[]>(
        `tasks-${status || "all"}`,
        () => fetchTasks(status),
        { revalidateOnFocus: false }
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("tasks-"), []);
    useRealtime("tasks", realtimeKey);

    return swr;
}

export function useDealStats(profileId?: string, isAdmin?: boolean) {
    return useSWR<{ activeCount: number, totalRevenue: number }>(
        profileId ? `deal-stats-${profileId}-${isAdmin}` : null,
        () => fetchDealStats(profileId, isAdmin),
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: Omit<Deal, "id" | "created_at" | "updated_at"> }) => {
            return await createDeal(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: { id: string; updates: Partial<Deal> } }) => {
            return await updateDeal(arg.id, arg.updates);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteDeal() {
    return useSWRMutation(
        "deals",
        async (_, { arg }: { arg: string }) => {
            await deleteDeal(arg);
        }
    );
}

export function useCreatePipeline() {
    return useSWRMutation(
        "pipelines",
        async (_, { arg }: { arg: Omit<Pipeline, "id" | "created_at"> }) => {
            return await createPipeline(arg);
        },
        { revalidate: true }
    );
}

export function useUpdatePipeline() {
    return useSWRMutation(
        "pipelines",
        async (_, { arg }: { arg: { id: string; updates: Partial<Pipeline> } }) => {
            return await updatePipeline(arg.id, arg.updates);
        },
        { revalidate: true }
    );
}

export function useDeletePipeline() {
    return useSWRMutation(
        "pipelines",
        async (_, { arg }: { arg: string }) => {
            await deletePipeline(arg);
        }
    );
}


