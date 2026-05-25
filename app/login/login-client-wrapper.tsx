"use client";

import nextDynamic from "next/dynamic";

const LoginContent = nextDynamic(
    () => import("./login-content"),
    { ssr: false }
);

export function LoginClientWrapper() {
    return <LoginContent />;
}
