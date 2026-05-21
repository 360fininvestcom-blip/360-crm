"use client";

import dynamic from "next/dynamic";
import React, { ReactNode } from "react";

interface ClientMotionProps {
    children: ReactNode;
    component?: string;
    className?: string;
    [key: string]: any;
}

const DynamicClientMotion = dynamic(
    () => import("./client-motion").then((mod) => mod.ClientMotion),
    { ssr: false }
);

export function ClientMotionSSR({ children, className, ...props }: ClientMotionProps) {
    return (
        <DynamicClientMotion className={className} {...props}>
            {children}
        </DynamicClientMotion>
    );
}
