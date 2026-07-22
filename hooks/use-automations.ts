"use client";

import useSWRMutation from "swr/mutation";
import type { AutomationRule } from "@/types";
import { 
    createAutomationRule, 
    updateAutomationRule, 
    deleteAutomationRule, 
    toggleAutomationRule 
} from "@/actions/automations";

// ============================================
// SWR HOOKS
// ============================================

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: Omit<AutomationRule, "id" | "created_at" | "updated_at"> }) => {
            return await createAutomationRule(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: { id: string; updates: Partial<AutomationRule> } }) => {
            return await updateAutomationRule(arg.id, arg.updates);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: string }) => {
            await deleteAutomationRule(arg);
        }
    );
}

export function useToggleAutomationRule() {
    return useSWRMutation(
        "automation-rules",
        async (_, { arg }: { arg: { id: string; is_active: boolean } }) => {
            return await toggleAutomationRule(arg.id, arg.is_active);
        }
    );
}
