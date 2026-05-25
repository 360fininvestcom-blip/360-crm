"use client";

import nextDynamic from "next/dynamic";

const SignupContent = nextDynamic(
    () => import("./signup-content"),
    { ssr: false }
);

export function SignupClientWrapper() {
    return <SignupContent />;
}
