"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { CalendarEvent } from "@/types";
import { getCalendarEvents, createCalendarEvent } from "@/actions/calendar";

// ============================================
// SWR HOOKS
// ============================================

export function useCalendarEvents() {
    const swr = useSWR<CalendarEvent[]>("calendar-events", async () => {
        return await getCalendarEvents();
    }, {
        revalidateOnFocus: false,
    });

    useRealtime("calendar_events", "calendar-events");

    return swr;
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCalendarEvent() {
    return useSWRMutation(
        "calendar-events",
        async (_, { arg }: { arg: Omit<CalendarEvent, "id" | "created_at" | "updated_at"> }) => {
            return await createCalendarEvent(arg);
        },
        {
            revalidate: true,
        }
    );
}
