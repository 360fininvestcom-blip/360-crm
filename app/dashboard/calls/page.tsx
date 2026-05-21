"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Clock,
    Settings,
    Download,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDialerStore } from "@/lib/stores";
import { useCallLogs } from "@/hooks/use-data";
import { formatDistanceToNow } from "date-fns";
import type { CallLog } from "@/types";

function getCallIcon(direction: string, status: string) {
    if (status === "missed" || status === "no_answer") {
        return <PhoneMissed className="h-4 w-4 text-red-500" />;
    }
    if (direction === "inbound") {
        return <PhoneIncoming className="h-4 w-4 text-green-500" />;
    }
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getInitials(firstName?: string, lastName?: string | null): string {
    const f = firstName?.[0] || "";
    const l = lastName?.[0] || "";
    return (f + l).toUpperCase() || "?";
}

function CallLogRow({ call, onCall }: { call: CallLog; onCall: (phone: string) => void }) {
    const contactName = call.contact
        ? `${call.contact.first_name} ${call.contact.last_name || ""}`.trim()
        : call.phone_number;
    const initials = call.contact
        ? getInitials(call.contact.first_name, call.contact.last_name)
        : "?";

    return (
        <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
                {getCallIcon(call.direction, call.status)}
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{contactName}</p>
                    <p className="text-sm text-muted-foreground">{call.phone_number}</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDuration(call.duration_seconds)}
                </div>
                <span className="text-sm text-muted-foreground min-w-[80px]">
                    {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCall(call.phone_number)}
                >
                    <Phone className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function CallsPage() {
    const { openDialer, setCurrentNumber, startCall } = useDialerStore();
    const { data: callLogs, isLoading, error } = useCallLogs(100);

    const handleCallContact = async (phone: string) => {
        setCurrentNumber(phone);
        openDialer();
        startCall();
        const { SipService } = await import("@/lib/services/sip-service");
        SipService.getInstance().call(phone);
    };

    // Calculate stats from real data
    const stats = useMemo(() => {
        if (!callLogs) return [
            { label: "Total Calls", value: "0", change: "" },
            { label: "Outbound", value: "0", change: "" },
            { label: "Inbound", value: "0", change: "" },
            { label: "Avg Duration", value: "0:00", change: "" },
        ];

        const total = callLogs.length;
        const outbound = callLogs.filter(c => c.direction === "outbound").length;
        const inbound = callLogs.filter(c => c.direction === "inbound").length;
        const totalDuration = callLogs.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
        const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

        return [
            { label: "Total Calls", value: total.toString(), change: "" },
            { label: "Outbound", value: outbound.toString(), change: "" },
            { label: "Inbound", value: inbound.toString(), change: "" },
            { label: "Avg Duration", value: formatDuration(avgDuration), change: "" },
        ];
    }, [callLogs]);

    // Filter calls by type
    const filteredCalls = useMemo(() => {
        if (!callLogs) return { all: [], outbound: [], inbound: [], missed: [] };
        return {
            all: callLogs,
            outbound: callLogs.filter(c => c.direction === "outbound"),
            inbound: callLogs.filter(c => c.direction === "inbound"),
            missed: callLogs.filter(c => c.status === "missed" || c.status === "no_answer"),
        };
    }, [callLogs]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
                    <p className="text-muted-foreground">
                        Manage your calls and view call history
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => alert("SIP Settings: Configure your SIP account in Settings > Integrations")}>
                        <Settings className="h-4 w-4 mr-2" />
                        SIP Settings
                    </Button>
                    <Button onClick={() => openDialer()}>
                        <Phone className="h-4 w-4 mr-2" />
                        Open Dialer
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">{stat.value}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Call Logs */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Call History</CardTitle>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Failed to load call logs</p>
                            <p className="text-sm">Run the add_call_logs.sql migration first</p>
                        </div>
                    ) : callLogs && callLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No calls yet</p>
                            <p className="text-sm">Make your first call using the dialer</p>
                            <Button className="mt-4" onClick={() => openDialer()}>
                                Open Dialer
                            </Button>
                        </div>
                    ) : (
                        <Tabs defaultValue="all">
                            <TabsList className="mb-4">
                                <TabsTrigger value="all">All Calls ({filteredCalls.all.length})</TabsTrigger>
                                <TabsTrigger value="outbound">Outbound ({filteredCalls.outbound.length})</TabsTrigger>
                                <TabsTrigger value="inbound">Inbound ({filteredCalls.inbound.length})</TabsTrigger>
                                <TabsTrigger value="missed">Missed ({filteredCalls.missed.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="space-y-2">
                                {filteredCalls.all.map((call) => (
                                    <CallLogRow key={call.id} call={call} onCall={handleCallContact} />
                                ))}
                            </TabsContent>

                            <TabsContent value="outbound" className="space-y-2">
                                {filteredCalls.outbound.map((call) => (
                                    <CallLogRow key={call.id} call={call} onCall={handleCallContact} />
                                ))}
                            </TabsContent>

                            <TabsContent value="inbound" className="space-y-2">
                                {filteredCalls.inbound.map((call) => (
                                    <CallLogRow key={call.id} call={call} onCall={handleCallContact} />
                                ))}
                            </TabsContent>

                            <TabsContent value="missed" className="space-y-2">
                                {filteredCalls.missed.map((call) => (
                                    <CallLogRow key={call.id} call={call} onCall={handleCallContact} />
                                ))}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
