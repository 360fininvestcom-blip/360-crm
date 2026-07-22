"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { CallLog } from "@/types";
import { getCallLogs, createCallLog } from "@/actions/calls";

// ============================================
// SWR HOOKS
// ============================================

export function useCallLogs(limit = 50, contactId?: string) {
    const swr = useSWR<CallLog[]>(
        contactId ? `call-logs-${contactId}-${limit}` : `call-logs-${limit}`,
        async () => {
            return await getCallLogs(limit, contactId);
        }
    );

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("call-logs-"), []);
    useRealtime("call_logs", realtimeKey);

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCallLog() {
    return useSWRMutation(
        "call-logs-50",
        async (_, { arg }: { arg: Omit<CallLog, "id" | "created_at"> }) => {
            return await createCallLog(arg);
        },
        {
            revalidate: true,
        }
    );
}
