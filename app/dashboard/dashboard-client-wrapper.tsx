"use client";

import nextDynamic from "next/dynamic";

const DashboardContent = nextDynamic(
    () => import("./dashboard-content"),
    { ssr: false }
);

export function DashboardClientWrapper() {
    return <DashboardContent />;
}
