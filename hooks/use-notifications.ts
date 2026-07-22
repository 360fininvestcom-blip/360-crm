"use client";

import { useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: "lead" | "system" | "task" | "mention" | "warning";
    linkUrl: string | null;
    read: boolean;
    createdAt: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const { data: session } = authClient.useSession();

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.read).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;

        const channelName = `private-notifications-${session.user.id}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind("notification-inserted", (payload: any) => {
            const newNotif = payload as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);

            toast(newNotif.title, {
                description: newNotif.message,
                action: newNotif.linkUrl ? {
                    label: "View",
                    onClick: () => router.push(newNotif.linkUrl!)
                } : undefined
            });
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [router]);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ readAll: true })
        });
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead };
}
