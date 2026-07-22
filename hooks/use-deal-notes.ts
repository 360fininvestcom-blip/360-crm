import useSWR from "swr";
import type { DealNote } from "@/types";
import { fetchDealNotes, createDealNote, deleteDealNote } from "@/app/actions/deals";

export function useDealNotes(dealId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<DealNote[]>(
        dealId ? `deal-notes-${dealId}` : null,
        async () => {
            if (!dealId) return [];
            return await fetchDealNotes(dealId);
        }
    );

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    };
}

export function useCreateDealNote() {
    return {
        trigger: async (note: { deal_id: string; author_id: string; content: string }) => {
            return await createDealNote({
                dealId: note.deal_id,
                authorId: note.author_id,
                content: note.content
            });
        },
    };
}

export function useDeleteDealNote() {
    return {
        trigger: async (noteId: string) => {
            await deleteDealNote(noteId);
        },
    };
}
