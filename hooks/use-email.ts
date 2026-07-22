"use client";

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import { useRealtime } from "./use-realtime";
import type { EmailTemplate, EmailSequence, SequenceEnrollment, SMTPConfig } from "@/types";
import { 
    getEmailTemplates, 
    getEmailSequences, 
    getSMTPConfigs,
    createEmailSequence,
    updateEmailSequence,
    deleteEmailSequence,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getSequenceEnrollments,
    enrollInSequence,
    updateEnrollment
} from "@/actions/email";

// ============================================
// FETCHERS
// ============================================

async function fetchEmails(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch emails");
    }
    return res.json();
}

// ============================================
// SWR HOOKS
// ============================================

export function useEmails(folder: string = "inbox", page: number = 1, limit: number = 50) {
    const key = `/api/email?folder=${folder}&page=${page}&limit=${limit}`;
    const swr = useSWR(key, fetchEmails, {
        revalidateOnFocus: false,
    });

    // Realtime subscription for emails
    // We subscribe to the 'emails' table and invalidate the key on change
    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("/api/email"), []);
    useRealtime("emails", realtimeKey);

    return swr;
}

export function useEmailTemplates() {
    const swr = useSWR<EmailTemplate[]>("email-templates", async () => {
        return await getEmailTemplates();
    }, {
        revalidateOnFocus: false,
    });

    useRealtime("email_templates", "email-templates");

    return swr;
}

export function useEmailSequences() {
    const swr = useSWR<EmailSequence[]>("email-sequences", async () => {
        return await getEmailSequences();
    }, {
        revalidateOnFocus: false,
    });

    useRealtime("email_sequences", "email-sequences");

    return swr;
}

export function useSMTPConfigs() {
    const swr = useSWR<SMTPConfig[]>("smtp-configs", async () => {
        return await getSMTPConfigs();
    }, {
        revalidateOnFocus: false,
    });

    useRealtime("smtp_configs", "smtp-configs");

    return swr;
}

// ============================================
// MUTATION HOOKS - EMAILS
// ============================================

export function useEmailBatchAction() {
    return useSWRMutation(
        "/api/email/batch",
        async (url, { arg }: { arg: { emailIds: string[], action: 'delete' | 'move' | 'mark_read' | 'mark_unread', destination?: string } }) => {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(arg),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to perform batch action");
            }
            return res.json();
        },
        {
            onSuccess: () => {
                // Invalidate email queries
                mutate((key) => typeof key === "string" && key.startsWith("/api/email"), undefined, { revalidate: true });
            }
        }
    );
}

// ============================================
// MUTATION HOOKS - SEQUENCES
// ============================================

export function useCreateEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: Omit<EmailSequence, "id" | "created_at" | "updated_at"> }) => {
            return await createEmailSequence(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: { id: string; updates: Partial<EmailSequence> } }) => {
            return await updateEmailSequence(arg.id, arg.updates);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteEmailSequence() {
    return useSWRMutation(
        "email-sequences",
        async (_, { arg }: { arg: string }) => {
            await deleteEmailSequence(arg);
        }
    );
}

// ============================================
// MUTATION HOOKS - TEMPLATES
// ============================================

export function useCreateEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: Omit<EmailTemplate, "id" | "created_at" | "updated_at"> }) => {
            return await createEmailTemplate(arg);
        },
        {
            revalidate: true,
        }
    );
}

export function useUpdateEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: { id: string; updates: Partial<EmailTemplate> } }) => {
            return await updateEmailTemplate(arg.id, arg.updates);
        },
        {
            revalidate: true,
        }
    );
}

export function useDeleteEmailTemplate() {
    return useSWRMutation(
        "email-templates",
        async (_, { arg }: { arg: string }) => {
            await deleteEmailTemplate(arg);
        }
    );
}

// ============================================
// MUTATION HOOKS - ENROLLMENTS
// ============================================

export function useSequenceEnrollments(sequenceId: string) {
    const swr = useSWR<SequenceEnrollment[]>(sequenceId ? `sequence-enrollments-${sequenceId}` : null, async () => {
        return await getSequenceEnrollments(sequenceId);
    }, {
        revalidateOnFocus: false
    });

    const realtimeKey = useMemo(() => (key: unknown) => typeof key === "string" && key.startsWith("sequence-enrollments"), []);
    useRealtime("sequence_enrollments", realtimeKey);

    return swr;
}

export function useEnrollInSequence() {
    return useSWRMutation(
        "sequence-enrollments",
        async (_, { arg }: { arg: { sequence_id: string; contact_ids: string[]; organization_id: string } }) => {
            return await enrollInSequence(arg);
        },
        {
            revalidate: true,
            onSuccess: () => {
                mutate("email-sequences");
            }
        }
    );
}

export function useUpdateEnrollment() {
    return useSWRMutation(
        "sequence-enrollments",
        async (_, { arg }: { arg: { id: string; updates: Partial<SequenceEnrollment>; sequence_id: string } }) => {
            return await updateEnrollment(arg.id, arg.updates);
        },
        {
            revalidate: true,
            onSuccess: (_data, _key, config) => {
                const arg = (config as { arg: { sequence_id?: string } }).arg;
                if (arg?.sequence_id) {
                    mutate(`sequence-enrollments-${arg.sequence_id}`);
                }
                mutate("email-sequences");
            }
        }
    );
}

export function useDeleteEnrollment() {
    return useSWRMutation(
        "sequence-enrollments",
        async (_, { arg }: { arg: { ids: string[]; sequence_id: string } }) => {
            const res = await fetch("/api/sequences/enrollments/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enrollmentIds: arg.ids })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to remove contact from sequence");
            }

            return res.json();
        },
        {
            revalidate: true,
            onSuccess: (_data, _key, config) => {
                const arg = (config as { arg: { sequence_id?: string } }).arg;
                if (arg?.sequence_id) {
                    mutate(`sequence-enrollments-${arg.sequence_id}`);
                }
                mutate("email-sequences");
            }
        }
    );
}

// ============================================
// MUTATION HOOKS - SMTP / ACCOUNTS
// ============================================

interface SaveEmailAccountArgs extends Partial<SMTPConfig> {
    smtp_pass?: string;
    imap_pass?: string;
}

export function useDeleteEmailAccount() {
    return useSWRMutation(
        "smtp-configs",
        async (_, { arg }: { arg: string }) => {
            const res = await fetch(`/api/settings/smtp?id=${arg}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete email account");
            }

            return res.json();
        },
        {
            revalidate: true,
        }
    );
}

export function useSaveEmailAccount() {
    return useSWRMutation(
        "smtp-configs",
        async (_, { arg }: { arg: SaveEmailAccountArgs & { orgId?: string } }) => {
            const { id, smtp_pass, imap_pass, orgId, ...rest } = arg;

            const updates: Record<string, unknown> = { ...rest };

            if (smtp_pass) updates.smtp_pass_plain = smtp_pass;
            if (imap_pass) updates.imap_pass_plain = imap_pass;

            const res = await fetch("/api/settings/smtp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    orgId,
                    updates
                }),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || "Failed to save email account");
            }

            return responseData;
        },
        {
            revalidate: true,
        }
    );
}
