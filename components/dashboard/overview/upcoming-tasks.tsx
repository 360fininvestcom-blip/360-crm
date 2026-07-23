"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveProfile, useTasks } from "@/hooks/use-data";
import { useMemo } from "react";
import type { Task } from "@/types";

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export function UpcomingTasks() {
    const { data: profile } = useActiveProfile();
    const { data: tasks, isLoading } = useTasks("pending");

    const isAdmin = profile?.role === "admin" || profile?.role === "manager";
    const myTasks = useMemo(() => isAdmin ? tasks : tasks?.filter((t: Task) => t.assignedTo?.id === profile?.id), [isAdmin, tasks, profile?.id]);

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming Tasks</CardTitle>
                <Button variant="ghost" size="sm">Add task</Button>
            </CardHeader>
            <CardContent className="space-y-3">
                {Array.isArray(myTasks) && myTasks.slice(0, 5).map((task: Task) => (
                    <motion.div
                        key={task.id}
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                                Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                            </p>
                        </div>
                        <Badge
                            variant={
                                task.priority === "high"
                                    ? "destructive"
                                    : task.priority === "medium"
                                        ? "default"
                                        : "secondary"
                            }
                        >
                            {task.priority || "low"}
                        </Badge>
                    </motion.div>
                ))}
                {(!Array.isArray(myTasks) || myTasks.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No upcoming tasks.</p>
                )}
            </CardContent>
        </Card>
    );
}
