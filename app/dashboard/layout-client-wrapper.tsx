"use client";

import nextDynamic from "next/dynamic";

const DashboardLayoutContent = nextDynamic(
    () => import("./layout-content"),
    { ssr: false }
);

export function DashboardLayoutClientWrapper({ children }: { children: React.ReactNode }) {
    return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
