import useSWR, { mutate } from "swr";
import { useRealtime } from "@/hooks/use-realtime";
import { useMemo } from "react";
import type { Task } from "@/types";
import { getTasks, createTask, updateTask, deleteTask } from "@/actions/tasks";

export function useTasks(filters?: {
    status?: string | "all";
    priority?: string | "all";
    assigned_to?: string | "all";
}) {
    const key = ["tasks", filters];

    const swr = useSWR(key, async () => {
        const data = await getTasks(filters);
        
        // Transform the data to match our interface
        return data.map(item => ({
            ...item,
            // Ensure nested objects are handled correctly if returned as array or null
            assignedTo: Array.isArray(item.assignedTo) ? item.assignedTo[0] : item.assignedTo,
            contact: Array.isArray(item.contact) ? item.contact[0] : item.contact,
            deal: Array.isArray(item.deal) ? item.deal[0] : item.deal,
        })) as Task[];
    });

    const realtimeKey = useMemo(() => (k: unknown) => {
        return typeof k === "string" && k === "tasks";
    }, []);

    useRealtime("tasks", realtimeKey);

    return swr;
}

export function useCreateTask() {
    return {
        trigger: async (newTask: Partial<Task>) => {
            const data = await createTask(newTask);
            mutate(key => Array.isArray(key) && key[0] === "tasks");
            return data;
        }
    };
}

export function useUpdateTask() {
    return {
        trigger: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
            const data = await updateTask(id, updates);
            mutate(key => Array.isArray(key) && key[0] === "tasks");
            return data;
        }
    };
}

export function useDeleteTask() {
    return {
        trigger: async (id: string) => {
            await deleteTask(id);
            mutate(key => Array.isArray(key) && key[0] === "tasks");
        }
    };
}
