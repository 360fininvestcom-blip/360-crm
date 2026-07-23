"use client";

import { motion } from "framer-motion";
import { Phone, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveProfile, useActivities } from "@/hooks/use-data";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

function getActivityIcon(type: string) {
    switch (type) {
        case "call": return <Phone className="h-4 w-4 text-blue-500" />;
        default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
}

export function ActivityTimeline() {
    const { data: profile } = useActiveProfile();
    const { data: activities, isLoading } = useActivities(5);

    const isAdmin = profile?.role === "admin" || profile?.role === "manager";
    const myActivities = useMemo(() => isAdmin ? activities : activities?.filter((a: any) => a.createdById === profile?.id), [isAdmin, activities, profile?.id]);

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-start gap-4 p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href="/dashboard/activities">
                    <Button variant="ghost" size="sm">View all</Button>
                </Link>
            </CardHeader>
            <CardContent className="space-y-4">
                {Array.isArray(myActivities) && myActivities.map((activity: any) => (
                    <motion.div
                        key={activity.id}
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{activity.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                                {activity.description}
                            </p>
                            <span className="text-xs text-muted-foreground flex items-center mt-1">
                                {activity.createdBy?.fullName || "System"} • {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : ""}
                            </span>
                        </div>
                    </motion.div>
                ))}
                
                {(!Array.isArray(myActivities) || myActivities.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground glass-panel rounded-xl bg-gradient-to-br from-primary/5 to-transparent border-primary/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
                        <Activity className="h-10 w-10 mb-3 text-primary/40 animate-pulse relative z-10" />
                        <p className="font-medium text-foreground relative z-10">No recent activity</p>
                        <p className="text-xs mt-1 relative z-10">Your timeline is clear.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
