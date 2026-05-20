"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDialerStore } from "@/lib/stores";
import type { SIPProfile } from "@/types";

export function SipProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const initSip = async () => {
            const { SipService } = await import("@/lib/services/sip-service");
            const sipService = SipService.getInstance();

            // Don't reinitialize if already connected and registered
            if (sipService.isConnected() && sipService.isRegistered()) {
                console.log("[SIP] Already connected and registered, skipping init");
                return;
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log("[SIP] No user logged in, using demo mode");
                sipService.connect({
                    uri: "sip:guest@demo.local",
                    ws_servers: "wss://demo.local/ws",
                    display_name: "Guest"
                });
                return;
            }

            // First get the profile to get the profile.id
            const { data: userProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!userProfile) {
                console.log("[SIP] No profile found, using demo mode");
                sipService.connect({
                    uri: `sip:${user.email?.replace("@", "_")}@demo.local`,
                    ws_servers: "wss://demo.local/ws",
                    display_name: user.email || "User"
                });
                return;
            }

            // Fetch all active SIP Profiles using the profile.id
            const { data: sipProfiles, error } = await supabase
                .from("sip_profiles")
                .select("*")
                .eq("user_id", userProfile.id)
                .eq("is_active", true);

            if (error) {
                console.error("[SIP] Error fetching SIP profiles:", error);
            }

            if (sipProfiles && sipProfiles.length > 0) {
                console.log(`[SIP] Found ${sipProfiles.length} active profiles:`, sipProfiles);
                (sipProfiles as SIPProfile[]).forEach(sipProfile => {
                    console.log(`[SIP] Raw DB Profile for ${sipProfile.sip_username}:`, {
                        websocket_server: sipProfile.websocket_server,
                        outbound_proxy: sipProfile.outbound_proxy,
                        registrar_server: sipProfile.registrar_server
                    });
                    let wsUrl;

                    if (sipProfile.websocket_server) {
                        // Use explicit websocket server if provided
                        wsUrl = sipProfile.websocket_server;
                    } else if (sipProfile.outbound_proxy) {
                        // Construct WebSocket URL from outbound proxy
                        const proxy = sipProfile.outbound_proxy;

                        // Check if it already has wss:// protocol
                        if (proxy.startsWith('wss://') || proxy.startsWith('ws://')) {
                            wsUrl = proxy;
                        } else {
                            // Add protocol and default WebSocket path if not present
                            // Check if port is already included
                            const hasPort = proxy.includes(':');
                            const hasPath = proxy.includes('/');

                            if (hasPort && hasPath) {
                                wsUrl = `wss://${proxy}`;
                            } else if (hasPort) {
                                // Has port but no path - no path needed for Commpeak
                                wsUrl = `wss://${proxy}`;
                            } else {
                                // No port, no path - add default :7443 for Commpeak WebRTC
                                wsUrl = `wss://${proxy}:7443`;
                            }
                        }
                    } else {
                        // Fallback to sip_domain with default WebSocket port (Commpeak standard)
                        wsUrl = `wss://${sipProfile.sip_domain}:7443`;
                    }

                    console.log(`[SIP] Derived wsUrl for ${sipProfile.name}: ${wsUrl}`);
                    console.log(`[SIP] Connecting account ${sipProfile.name} to ${wsUrl} as ${sipProfile.sip_username}@${sipProfile.sip_domain}`);

                    console.log(`[SIP] Password field present:`, !!sipProfile.sip_password_encrypted, `Length:`, sipProfile.sip_password_encrypted?.length || 0);

                    sipService.connect({
                        uri: `sip:${sipProfile.sip_username}@${sipProfile.sip_domain}`,
                        password: sipProfile.sip_password_encrypted || "",
                        auth_user: sipProfile.sip_auth_user || undefined,
                        protocol: sipProfile.sip_protocol || "wss",
                        ws_servers: wsUrl,
                        display_name: sipProfile.display_name || sipProfile.sip_username,
                        outbound_proxy: sipProfile.outbound_proxy || undefined,
                        registrar_server: sipProfile.registrar_server || undefined,
                        sip_domain: sipProfile.sip_domain,
                        janus_url: sipProfile.janus_url || undefined,
                        janus_secret: sipProfile.janus_secret || undefined,
                        engine: sipProfile.engine || "janus",
                    }, sipProfile.id);

                    // If this is the default account, set it in the store
                    if (sipProfile.is_default) {
                        useDialerStore.getState().setSelectedSipAccountId(sipProfile.id);
                        sipService.activeUAId = sipProfile.id;
                    }
                });

                // If no default was set, use the first one
                if (!sipService.activeUAId && sipProfiles.length > 0) {
                    useDialerStore.getState().setSelectedSipAccountId(sipProfiles[0].id);
                    sipService.activeUAId = sipProfiles[0].id;
                }
            } else {
                console.log("[SIP] No valid SIP profiles configured, using demo mode");
                const sipUsername = (user.email || "user").replace("@", "_");
                sipService.connect({
                    uri: `sip:${sipUsername}@demo.local`,
                    ws_servers: "wss://demo.local/ws",
                    display_name: user.email || "User",
                }, "demo");
                useDialerStore.getState().setSelectedSipAccountId("demo");
                sipService.activeUAId = "demo";
            }
        };

        // Initialize SIP Service after client-side hydration
        const timer = setTimeout(() => {
            initSip();
        }, 1000);

        return () => {
            clearTimeout(timer);
        };
    }, []);

    return <>{children}</>;
}
