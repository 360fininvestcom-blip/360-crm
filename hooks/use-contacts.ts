"use client";

import { useMemo } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { Contact, ContactStatus } from "@/types";
import {
    fetchContacts,
    fetchContactsPaginated,
    fetchContactByPhone,
    fetchContactStatuses,
    fetchContactCount,
    updateContact,
    deleteContact,
    bulkDeleteContacts,
    bulkCreateContacts,
    createContactStatus,
    deleteContactStatus,
    PaginationParams,
    PaginatedResult
} from "@/app/actions/contacts";

export type { PaginationParams, PaginatedResult };

// ============================================
// DEFAULT STATUSES
// ============================================

const DEFAULT_STATUSES: Omit<ContactStatus, "id" | "organizationId" | "createdAt">[] = [
    { name: "new", label: "New", color: "gray", order: 1 },
    { name: "no_answer", label: "No Answer", color: "orange", order: 2 },
    { name: "reassign", label: "Reassign", color: "orange", order: 3 },
    { name: "recovery", label: "Recovery", color: "blue", order: 4 },
    { name: "not_interested", label: "Not interested", color: "red", order: 5 },
    { name: "call_back", label: "Call back", color: "blue", order: 6 },
    { name: "not_potential", label: "Not potential", color: "slate", order: 7 },
    { name: "voice_message", label: "Voice message", color: "purple", order: 8 },
    { name: "depositor", label: "Depositor", color: "green", order: 9 },
    { name: "high_potential", label: "High Potential", color: "yellow", order: 10 },
];

async function fetchContactStatusesWithFallback() {
    try {
        const statuses = await fetchContactStatuses();
        if (statuses && statuses.length > 0) return statuses;
    } catch (e) {
        console.warn("Could not fetch custom statuses, using defaults:", e);
    }
    
    return DEFAULT_STATUSES.map((s, i) => ({
        ...s,
        id: `default-${i}`,
        organizationId: "default",
        createdAt: new Date()
    })) as ContactStatus[];
}

// ============================================
// SWR HOOKS
// ============================================

/**
 * Fetch all contacts (legacy, no pagination)
 */
export function useContacts() {
    const swr = useSWR<Contact[]>("contacts", fetchContacts, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    });

    const realtimeKey = useMemo(() => (key: unknown) =>
        typeof key === "string" && (key === "contacts" || key.startsWith("contact-") || key.startsWith("contacts-paginated")),
        []);

    useRealtime("contacts", realtimeKey);

    return swr;
}


export function useContactsPaginated(params: PaginationParams = {}) {
    const key = `contacts-paginated-${JSON.stringify(params)}`;
    return useSWR<PaginatedResult<Contact>>(
        key,
        () => fetchContactsPaginated(params),
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );
}

export function useContactByPhone(phone: string | null) {
    return useSWR<Contact | null>(
        phone ? `contact-phone-${phone}` : null,
        () => (phone ? fetchContactByPhone(phone) : null),
        { revalidateOnFocus: false }
    );
}

export function useContactStatuses() {
    const swr = useSWR<ContactStatus[]>("contact-statuses", fetchContactStatusesWithFallback, {
        revalidateOnFocus: false,
    });

    useRealtime("contact_statuses", "contact-statuses");

    return swr;
}

export function useContactCount(profileId?: string, isAdmin?: boolean) {
    return useSWR<number>(
        profileId ? `contact-count-${profileId}-${isAdmin}` : null,
        () => fetchContactCount(profileId, isAdmin),
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: Omit<Contact, "id" | "createdAt" | "updatedAt"> }) => {
            const res = await fetch('/api/internal/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(arg)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create contact");
            }

            return res.json();
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: { id: string; updates: Partial<Contact> } }) => {
            // Safety check: ensure updates is serializable and not circular
            try {
                JSON.stringify(arg.updates);
            } catch {
                console.error("[useUpdateContact] Invalid updates payload:", arg.updates);
                throw new Error("Invalid update payload: circular reference or non-serializable object detected.");
            }

            return await updateContact(arg.id, arg.updates);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteContact() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: string }) => {
            await deleteContact(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useBulkDeleteContacts() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: string[] }) => {
            if (arg.length === 0) return;
            await bulkDeleteContacts(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useBulkCreateContacts() {
    return useSWRMutation(
        "contacts",
        async (_, { arg }: { arg: Omit<Contact, "id" | "createdAt" | "updatedAt">[] }) => {
            return await bulkCreateContacts(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useCreateContactStatus() {
    return useSWRMutation(
        "contact-statuses",
        async (_, { arg }: { arg: Omit<ContactStatus, "id" | "createdAt"> }) => {
            return await createContactStatus(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteContactStatus() {
    return useSWRMutation(
        "contact-statuses",
        async (_, { arg }: { arg: string }) => {
            await deleteContactStatus(arg);
        }
    );
}
