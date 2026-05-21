"use client";

import dynamic from "next/dynamic";

const LandingPageContent = dynamic(
  () => import("@/components/landing/landing-page"),
  { ssr: false }
);

export default function LandingPage() {
  return <LandingPageContent />;
}
