import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: WorkerGlobalScope & typeof globalThis;

// Custom caching rules to prepend to the defaultCache
const customCacheRules = [
    // 1. Never cache Supabase database queries or real-time channels
    {
        matcher: ({ url }: { url: URL }) => url.hostname.includes("supabase.co"),
        handler: new NetworkOnly(),
    },
    // 2. Never cache Janus SIP signaling servers or third-party WebSocket/REST endpoints
    {
        matcher: ({ url }: { url: URL }) => 
            url.hostname.includes("nanocall.space") || 
            url.hostname.includes("illyvoip.com"),
        handler: new NetworkOnly(),
    },
    // 3. Never cache dynamic CRM routes (like dashboard, settings, profiles, calls, or APIs)
    // caching these causes stale states, authentication loops, and offline intercept failures
    {
        matcher: ({ url }: { url: URL }) => 
            url.pathname.startsWith("/dashboard") || 
            url.pathname.startsWith("/api"),
        handler: new NetworkOnly(),
    }
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [...customCacheRules, ...defaultCache],
});

serwist.addEventListeners();

