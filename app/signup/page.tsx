"use client";

import dynamic from "next/dynamic";

const SignupContent = dynamic(() => import("./signup-content"), { ssr: false });

export default function SignupPage() {
    return <SignupContent />;
}
