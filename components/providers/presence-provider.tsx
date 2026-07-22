"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { useActiveProfile } from "@/hooks/use-data";

interface PresenceState {
    users: Record<string, {
        profile_id: string;
        email: string;
        full_name: string;
        avatar_url?: string;
        last_seen: string;
        current_path: string;
    }>;
}

const PresenceContext = createContext<{
    presence: PresenceState;
    onlineCount: number;
} | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const { data: profile } = useActiveProfile();
    const [presence, setPresence] = useState<PresenceState>({ users: {} });

    useEffect(() => {
        if (!profile?.organization_id) return;

        const channelName = `presence-org-${profile.organization_id}`;
        const channel = pusherClient.subscribe(channelName) as any;

        channel.bind('pusher:subscription_succeeded', (members: any) => {
            const formattedUsers: PresenceState["users"] = {};
            members.each((member: any) => {
                formattedUsers[member.id] = member.info;
            });
            setPresence({ users: formattedUsers });
        });

        channel.bind('pusher:member_added', (member: any) => {
            setPresence(prev => ({
                users: { ...prev.users, [member.id]: member.info }
            }));
        });

        channel.bind('pusher:member_removed', (member: any) => {
            setPresence(prev => {
                const newUsers = { ...prev.users };
                delete newUsers[member.id];
                return { users: newUsers };
            });
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    }, [profile]);

    return (
        <PresenceContext.Provider value={{ presence, onlineCount: Object.keys(presence.users).length }}>
            {children}
        </PresenceContext.Provider>
    );
}

export const usePresence = () => {
    const context = useContext(PresenceContext);
    if (context === undefined) {
        throw new Error("usePresence must be used within a PresenceProvider");
    }
    return context;
};
