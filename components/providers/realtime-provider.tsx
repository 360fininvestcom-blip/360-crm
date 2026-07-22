"use client";

import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher-client";
import { toast } from "sonner";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const contactsChannel = pusherClient.subscribe('public-contacts');
        contactsChannel.bind('contact-inserted', (payload: any) => {
            toast.success("New Contact Added", {
                description: `${payload.first_name} ${payload.last_name || ''} was just added to the CRM.`,
            });
        });

        const dealsChannel = pusherClient.subscribe('public-deals');
        dealsChannel.bind('deal-inserted', (payload: any) => {
            toast.success("New Deal Created", {
                description: `Deal "${payload.name}" was just added to the pipeline.`,
            });
        });

        return () => {
            contactsChannel.unbind_all();
            pusherClient.unsubscribe('public-contacts');
            dealsChannel.unbind_all();
            pusherClient.unsubscribe('public-deals');
        };
    }, []);

    return <>{children}</>;
}
