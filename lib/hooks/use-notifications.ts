"use client";

import { useState, useEffect } from 'react';
import { useActiveProfile } from '@/hooks/use-data';
import { pusherClient } from '@/lib/pusher-client';
import { toast } from 'sonner';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from '@/actions/notifications';

export interface AppNotification {
    id: string;
    organization_id: string;
    user_id: string;
    title: string;
    message?: string;
    type: string;
    is_read: boolean;
    link_url?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
}

export function useNotifications() {
    const { data: profile } = useActiveProfile();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;

        // 1. Fetch initial notifications
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const data = await getNotifications();
                setNotifications(data);
                setUnreadCount(data.filter((n: AppNotification) => !n.is_read).length);
            } catch (error) {
                console.error("Error fetching notifications", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        // 2. Subscribe to Realtime changes via Pusher
        const channelName = `private-user-${profile.id}`;
        const channel = pusherClient.subscribe(channelName);
        
        channel.bind('notification-inserted', (payload: any) => {
            const newNotification = payload as AppNotification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            toast(newNotification.title, {
                description: newNotification.message,
                action: newNotification.link_url ? {
                    label: 'View',
                    onClick: () => window.location.href = newNotification.link_url!
                } : undefined
            });
        });

        channel.bind('notification-updated', (payload: any) => {
            const updated = payload as AppNotification;
            setNotifications((prev) => {
                const oldNotification = prev.find(n => n.id === updated.id);
                if (oldNotification?.is_read === false && updated.is_read === true) {
                    setUnreadCount((count) => Math.max(0, count - 1));
                }
                return prev.map((n) => (n.id === updated.id ? updated : n));
            });
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [profile?.id]);

    const markAsRead = async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if (!profile?.id) return;

        setNotifications((prev) =>
            prev.map((n) => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        await markAllNotificationsAsRead();
    };

    const clearAll = async () => {
        if (!profile?.id) return;
        setNotifications([]);
        setUnreadCount(0);
        await clearAllNotifications();
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        clearAll
    };
}
