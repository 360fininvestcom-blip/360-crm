import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

const getBaseURL = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
};

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback_secret_for_development_only",
    baseURL: getBaseURL(),
    database: prismaAdapter(prisma, {
        provider: "postgresql" 
    }),
    emailAndPassword: {
        enabled: true
    },
})
