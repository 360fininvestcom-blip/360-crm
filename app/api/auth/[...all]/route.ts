import { auth } from "@/lib/auth"; // path to your auth file
import { toNodeHandler } from "better-auth/node";

export const GET = auth.handler;
export const POST = auth.handler;
