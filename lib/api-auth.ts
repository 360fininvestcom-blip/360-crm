import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/**
 * Validates a CRM API Key and returns the associated organization_id
 * Supports both modern "nk_live_" keys (hashed) and legacy CRM integration keys (plain text).
 * @param apiKey The API key from X-Api-Key header
 * @returns organization_id or null if invalid
 */
export async function validateApiKey(apiKey: string | null): Promise<string | null> {
    if (!apiKey) return null;

    // 1. Check for Modern API Key (prefixed with nk_live_)
    if (apiKey.startsWith("nk_live_")) {
        const keyHash = createHash("sha256").update(apiKey).digest("hex");
        
        const orgApiKeys: any[] = await prisma.$queryRaw`
            SELECT organization_id FROM organization_api_keys
            WHERE key_hash = ${keyHash} AND is_active = true
            LIMIT 1
        `;

        if (orgApiKeys.length === 0) {
            console.log("API Auth: Modern key validation failed or inactive");
            return null;
        }
        return orgApiKeys[0].organization_id;
    }

    // 2. Check for Legacy CRM Integration Key (plain text from api_keys table)
    const apiKeys: any[] = await prisma.$queryRaw`
        SELECT organization_id FROM api_keys
        WHERE crm_api_key = ${apiKey}
        LIMIT 1
    `;

    if (apiKeys.length === 0) {
        return null;
    }

    return apiKeys[0].organization_id;
}
