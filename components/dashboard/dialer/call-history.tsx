"use client";

import React, { useState } from "react";
import { Phone, User, History as HistoryIcon, Loader2, Sparkles, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useCallLogs } from "@/hooks/use-calls";

interface CallHistoryProps {
    onDial: (number: string, name?: string) => void;
    contactId?: string;
}

export const CallHistory = React.memo(({ onDial, contactId }: CallHistoryProps) => {
    const { data: calls = [], isLoading } = useCallLogs(20, contactId);
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

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

            <div className="space-y-2">
                {calls.map((call) => {
                    const name = call.contact ? `${call.contact.first_name} ${call.contact.last_name || ""}`.trim() : null;
                    const isSuccess = call.status === "completed";
                    const isExpanded = expandedCallId === call.id;

                    return (
                        <div
                            key={call.id}
                            className={cn(
                                "rounded-xl border transition-all duration-200 overflow-hidden",
                                isExpanded ? "bg-muted/40 border-primary/20 shadow-sm" : "bg-card border-border/50 hover:bg-muted/20"
                            )}
                        >
                            {/* Card Header/Trigger */}
                            <div
                                onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                className="flex items-center gap-3 p-3 cursor-pointer select-none"
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                                    isSuccess ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                                )}>
                                    {name ? <User className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-sm font-semibold truncate hover:text-primary transition-colors">
                                        {name || call.phone_number}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
                                        <span className="truncate">{call.phone_number}</span>
                                        <span>•</span>
                                        <span>{formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Expand indicator */}
                                    <div className="text-muted-foreground opacity-60">
                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                    {/* Direct dial button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDial(call.phone_number, name || undefined);
                                        }}
                                        className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all"
                                    >
                                        <Phone className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-border/55 bg-background/55 p-3.5 space-y-4 text-xs">
                                    {/* Call Stats */}
                                    <div className="grid grid-cols-2 gap-4 text-[11px] text-muted-foreground pb-2 border-b">
                                        <div>
                                            <span className="font-semibold uppercase tracking-wider text-[9px]">Direction:</span>
                                            <span className="ml-1.5 capitalize">{call.direction}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold uppercase tracking-wider text-[9px]">Duration:</span>
                                            <span className="ml-1.5">{call.duration_seconds}s</span>
                                        </div>
                                    </div>

                                    {/* AI Summary */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-semibold text-primary">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span>AI Call Summary</span>
                                        </div>
                                        {call.summary ? (
                                            <div className="text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/30 whitespace-pre-line leading-relaxed">
                                                {call.summary}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted-foreground p-2.5 bg-muted/30 rounded-lg">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                <span>AI Copilot is analyzing call log...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Call Transcript */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-semibold text-primary">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            <span>AI Call Transcript</span>
                                        </div>
                                        {call.transcription ? (
                                            <div className="text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/30 font-mono text-[10px] whitespace-pre-line leading-relaxed max-h-[160px] overflow-y-auto">
                                                {call.transcription}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted-foreground p-2.5 bg-muted/30 rounded-lg">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                <span>Transcribing call recording...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

CallHistory.displayName = "CallHistory";
