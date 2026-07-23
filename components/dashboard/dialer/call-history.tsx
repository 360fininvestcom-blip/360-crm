"use client";

import React from "react";
import { Phone, User, History as HistoryIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useCallLogs } from "@/hooks/use-calls";

interface CallHistoryProps {
    onDial: (number: string, name?: string) => void;
    contactId?: string;
}

export const CallHistory = React.memo(({ onDial, contactId }: CallHistoryProps) => {
    const { data: calls = [], isLoading } = useCallLogs(20, contactId);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground space-y-4">
                <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                <p className="text-sm font-medium">Loading history...</p>
            </div>
        );
    }

    if (calls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground space-y-4">
                <div className="p-4 bg-muted/50 rounded-full">
                    <HistoryIcon className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-sm font-medium">No recent calls</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
            </div>

            <div className="space-y-1">
                {calls.map((call) => {
                    const name = call.contact ? `${call.contact.first_name} ${call.contact.last_name || ""}`.trim() : null;
                    const isSuccess = call.status === "completed";
                    return (
                        <button
                            key={call.id}
                            onClick={() => onDial(call.phone_number, name || undefined)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 group transition-all text-left border border-transparent hover:border-primary/10"
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                                isSuccess ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            )}>
                                {name ? <User className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                    {name || call.phone_number}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                                    <span className="truncate">{call.phone_number}</span>
                                    <span>•</span>
                                    <span>{formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Phone className="h-4 w-4 text-primary" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

CallHistory.displayName = "CallHistory";
