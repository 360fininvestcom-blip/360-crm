"use client";

import nextDynamic from "next/dynamic";

const LandingPageContent = nextDynamic(
  () => import("@/components/landing/landing-page"),
  { ssr: false }
);

export function PageClientWrapper() {
  return <LandingPageContent />;
}
