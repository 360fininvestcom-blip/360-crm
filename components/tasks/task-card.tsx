"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User2, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style as React.CSSProperties}
                className="opacity-50 h-[140px] rounded-lg border-2 border-primary bg-background shadow-xl"
            />
        );
    }

    const priorityColors = {
        high: "text-red-500 bg-red-500/10 border-red-500/20",
        medium: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    };

    return (
        <Card
            ref={setNodeRef}
            style={style as React.CSSProperties}
            className={cn(
                "group relative cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:border-primary/50",
                isDragging && "opacity-0"
            )}
        >
            <div {...attributes} {...listeners} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted cursor-move text-muted-foreground">
                <GripVertical className="h-4 w-4" />
            </div>

            <CardHeader className="p-3 pb-0 space-y-2">
                <div className="flex items-start justify-between pr-6">
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", priorityColors[task.priority])}>
                        {task.priority}
                    </Badge>
                    {task.dueDate && (
                        <div className={cn(
                            "flex items-center text-[10px]",
                            new Date(task.dueDate) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"
                        )}>
                            {format(new Date(task.dueDate), "MMM d")}
                        </div>
                    )}
                </div>
                <h4 className="font-semibold text-sm leading-snug line-clamp-2">{task.title}</h4>
            </CardHeader>

            <CardContent className="p-3 pt-2">
                {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
                        {task.description}
                    </p>
                )}

                <div className="flex items-center justify-between mt-auto">
                    {task.contact ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full max-w-[120px] truncate">
                            <User2 className="h-3 w-3" />
                            <span className="truncate">{task.contact.firstName} {task.contact.lastName}</span>
                        </div>
                    ) : <div />}

                    {task.assignedTo && (
                        <Avatar className="h-5 w-5 border ring-1 ring-background">
                            <AvatarImage src={task.assignedTo?.avatarUrl || undefined} />
                            <AvatarFallback className="text-[8px]">{task.assignedTo?.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
