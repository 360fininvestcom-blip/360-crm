"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { pusherClient } from "@/lib/pusher-client";

/**
 * A reusable hook to subscribe to Pusher Realtime changes for a specific table.
 * When a change occurs, it triggers an SWR mutation for the provided keys.
 * 
 * @param table The table name to subscribe to
 * @param swrKeys One or more SWR keys to revalidate on change, or a filter function
 * @param filter Optional filter (used as part of channel name if needed)
 */
export function useRealtime(
    table: string,
    swrKeys: string | string[] | ((key: unknown) => boolean),
    filter?: string
) {
    useEffect(() => {
        // Sanitize filter to be URL safe for Pusher channel names
        const safeFilter = filter ? filter.replace(/[^a-zA-Z0-9_-]/g, '_') : 'all';
        const channelName = `private-${table}-${safeFilter}`;
        
        console.log(`[Realtime] Initializing channel: ${channelName}`);
        const channel = pusherClient.subscribe(channelName);

        const triggerMutate = (payload: any) => {
            console.log(`[Realtime] Change detected in ${table}:`, payload);
            if (typeof swrKeys === "function") {
                mutate(swrKeys);
            } else {
                const keys = Array.isArray(swrKeys) ? swrKeys : [swrKeys];
                keys.forEach(key => mutate(key));
            }
        };

        channel.bind("change", (payload: any) => triggerMutate(payload));

        channel.bind("pusher:subscription_succeeded", () => {
            console.log(`[Realtime] Subscription status for ${table}: SUBSCRIBED`);
        });

        channel.bind("pusher:subscription_error", (error: any) => {
            console.error(`[Realtime] Subscription error for ${table}:`, error);
        });

        return () => {
            console.log(`[Realtime] Cleaning up channel for ${table}`);
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [table, swrKeys, filter]);
}
