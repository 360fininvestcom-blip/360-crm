"use client";

import dynamic from "next/dynamic";

const DynamicMouseGlow = dynamic(
    () => import("./mouse-glow").then((mod) => mod.MouseGlow),
    { ssr: false }
);

export function MouseGlowSSR() {
    return <DynamicMouseGlow />;
}
