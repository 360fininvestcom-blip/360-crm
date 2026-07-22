"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { authClient } from "@/lib/auth-client";
import type { Profile, Organization, SIPProfile, APIKeys, UserIntegration } from "@/types";
import { 
    getActiveProfile, 
    getProfiles, 
    getOrganization, 
    getApiKeys, 
    getIntegrations, 
    updateProfile, 
    deleteProfile, 
    updateOrganization, 
    updateApiKeys, 
    getSipAccounts, 
    saveSipAccount, 
    deleteSipAccount, 
    setDefaultSipAccount 
} from "@/app/actions/settings";

// ============================================
// SWR HOOKS
// ============================================

export function useActiveProfile() {
    return useSWR<Profile | null>("active-profile", async () => {
        return (await getActiveProfile()) as Profile | null;
    });
}

export function useProfiles() {
    return useSWR<Profile[]>("profiles", async () => {
        return (await getProfiles()) as Profile[];
    });
}

export function useOrganization(id: string | null) {
    return useSWR<Organization | null>(id ? `org-${id}` : null, async () => {
        if (!id) return null;
        return (await getOrganization(id)) as Organization | null;
    });
}

export function useApiKeys(orgId: string | null) {
    return useSWR<APIKeys | null>(orgId ? `api-keys-${orgId}` : null, async () => {
        if (!orgId) return null;
        return (await getApiKeys(orgId)) as APIKeys | null;
    });
}

export function useIntegrations(userId: string | null) {
    return useSWR<UserIntegration[] | null>(userId ? `integrations-${userId}` : null, async () => {
        if (!userId) return [];
        return (await getIntegrations(userId)) as UserIntegration[];
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useUpdateProfile() {
    return useSWRMutation("profiles", async (_, { arg }: { arg: { id: string; updates: Partial<Profile> } }) => {
        return await updateProfile(arg.id, arg.updates);
    });
}

export function useDeleteProfile() {
    return useSWRMutation("profiles", async (_, { arg }: { arg: string }) => {
        await deleteProfile(arg);
    });
}

export function useUpdateOrganization() {
    return useSWRMutation("organizations", async (_, { arg }: { arg: { id: string; updates: Partial<Organization> } }) => {
        return await updateOrganization(arg.id, arg.updates);
    });
}

export function useUpdateApiKeys() {
    return useSWRMutation("api-keys", async (_, { arg }: { arg: { orgId: string; updates: Partial<APIKeys> } }) => {
        return await updateApiKeys(arg.orgId, arg.updates);
    });
}

export function useSyncCalendar() {
    return useSWRMutation("integrations", async (_, { arg }: { arg: { provider: string } }) => {
        const res = await fetch("/api/integrations/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(arg),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to sync calendar");
        return data;
    });
}

// ============================================
// SIP MULTI-ACCOUNT HOOKS
// ============================================

export function useSipAccounts(userId: string | null) {
    return useSWR<SIPProfile[]>(userId ? `sip-accounts-${userId}` : null, async () => {
        if (!userId) return [];
        return (await getSipAccounts(userId)) as SIPProfile[];
    });
}

export function useSaveSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: {
        arg: {
            id?: string;
            userId: string;
            orgId: string;
            data: Partial<SIPProfile>;
        }
    }) => {
        return await saveSipAccount(arg.id, arg.userId, arg.orgId, arg.data);
    });
}

export function useDeleteSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: { arg: string }) => {
        await deleteSipAccount(arg);
    });
}

export function useSetDefaultSipAccount() {
    return useSWRMutation("sip-accounts", async (_, { arg }: { arg: { id: string; userId: string } }) => {
        return await setDefaultSipAccount(arg.id, arg.userId);
    });
}

export function useUpdatePassword() {
    return useSWRMutation("auth-password", async (_, { arg }: { arg: { newPassword: string; currentPassword: string } }) => {
        const { data, error } = await authClient.changePassword({
            newPassword: arg.newPassword,
            currentPassword: arg.currentPassword,
            revokeOtherSessions: true
        });
        if (error) throw error;
        return data;
    });
}

export function useDeleteUserAccountFinal() {
    return useSWRMutation("auth-delete", async () => {
        const res = await fetch("/api/auth/delete-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete account");
        return data;
    });
}
