"use client";

import { useEffect } from "react";
import { useActiveProfile, useOrganization } from "@/hooks/use-data";

// Converts hex color to HSL values
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    // Remove # if present
    hex = hex.replace(/^#/, "");

    // Parse hex values
    let r, g, b;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else {
        return null;
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/**
 * Provider that injects organization branding colors as CSS variables
 * Place this in the dashboard layout to apply org colors globally
 */
export function OrgBrandingProvider({ children }: { children: React.ReactNode }) {
    const { data: profile } = useActiveProfile();
    const { data: org } = useOrganization(profile?.organizationId || null);

    useEffect(() => {
        if (!org?.primaryColor) return;

        const hsl = hexToHSL(org.primaryColor);
        if (!hsl) return;

        // Set CSS custom properties for Shadcn UI theming
        const root = document.documentElement;

        // Primary color (used by buttons, links, etc.)
        root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        root.style.setProperty("--primary-foreground", hsl.l > 50 ? "0 0% 0%" : "0 0% 100%");

        // Ring color (focus rings)
        root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);

        // Accent color (slightly lighter/darker variant)
        const accentL = hsl.l > 50 ? hsl.l - 10 : hsl.l + 10;
        root.style.setProperty("--accent", `${hsl.h} ${hsl.s}% ${accentL}%`);

        // Cleanup on unmount or org change
        return () => {
            root.style.removeProperty("--primary");
            root.style.removeProperty("--primary-foreground");
            root.style.removeProperty("--ring");
            root.style.removeProperty("--accent");
        };
    }, [org?.primaryColor]);

    return <>{children}</>;
}
