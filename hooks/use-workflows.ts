"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { Workflow } from "@/types";
import { 
    getWorkflows, 
    createWorkflow, 
    updateWorkflow, 
    deleteWorkflow 
} from "@/actions/workflows";

// ============================================
// SWR HOOKS
// ============================================

export function useWorkflows() {
    const swr = useSWR<Workflow[]>("workflows", async () => {
        return await getWorkflows();
    }, {
        revalidateOnFocus: false,
    });

    useRealtime("workflows", "workflows");

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: Omit<Workflow, "id" | "created_at" | "updated_at"> }) => {
            return await createWorkflow(arg);
        }
    );
}

export function useUpdateWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: { id: string; updates: Partial<Workflow> } }) => {
            return await updateWorkflow(arg.id, arg.updates);
        }
    );
}

export function useDeleteWorkflow() {
    return useSWRMutation(
        "workflows",
        async (_, { arg }: { arg: string }) => {
            await deleteWorkflow(arg);
        }
    );
}
