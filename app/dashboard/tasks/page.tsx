"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    Plus,
    Search,
    Calendar as CalendarIcon,
    CheckCircle2,
    Circle,
    Clock,
    MoreHorizontal,
    Trash2,
    Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTasks, useDeleteTask } from "@/hooks/use-tasks";
import { useActiveProfile } from "@/hooks/use-data";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as React from "react";
import type { Task } from "@/types";
import { Loader2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { TaskBoard } from "@/components/tasks/task-board";

export default function TasksPage() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const { data: profile } = useActiveProfile();
    const { data: tasks, isLoading } = useTasks({
        status: statusFilter,
        priority: priorityFilter,
    });

    const { trigger: deleteTask } = useDeleteTask();

    const filteredTasks = tasks?.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (task: Task) => {
        setSelectedTask(task);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedTask(null);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await deleteTask(id);
            toast.success("Task deleted");
        } catch {
            toast.error("Failed to delete task");
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "text-red-500 bg-red-50 border-red-200";
            case "medium": return "text-yellow-500 bg-yellow-50 border-yellow-200";
            case "low": return "text-blue-500 bg-blue-50 border-blue-200";
            default: return "text-gray-500 bg-gray-50 border-gray-200";
        }
    };


    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground">
                        Manage your to-do list and team assignments
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>

            <Tabs defaultValue="board" className="flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <TabsList>
                        <TabsTrigger value="board">
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Board
                        </TabsTrigger>
                        <TabsTrigger value="list">
                            <List className="h-4 w-4 mr-2" />
                            List
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                className="pl-10 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[120px] h-9">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priority</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <TabsContent value="board" className="flex-1 overflow-hidden mt-0">
                    <TaskBoard tasks={filteredTasks || []} isLoading={isLoading} />
                </TabsContent>

                <TabsContent value="list" className="mt-0">
                    <Card>
                        <CardHeader className="pb-3 border-b hidden">
                            {/* Filters handled globally now */}
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                    <span>Loading tasks...</span>
                                </div>
                            ) : !filteredTasks || filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                                    <h3 className="text-lg font-semibold mb-1">No tasks found</h3>
                                    <p>Get started by creating a new task.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredTasks.map((task) => (
                                        <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1">
                                                    {/* Status Badge */}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("font-medium text-base", task.status === "completed" && "line-through text-muted-foreground")}>
                                                            {task.title}
                                                        </span>
                                                        <TaskStatusBadge task={task} />
                                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border ml-2", getPriorityColor(task.priority))}>
                                                            {task.priority}
                                                        </Badge>
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                                        {task.dueDate && (
                                                            <div className={cn("flex items-center gap-1", new Date(task.dueDate) < new Date() && task.status !== "completed" ? "text-red-500 font-medium" : "")}>
                                                                <CalendarIcon className="h-3 w-3" />
                                                                {format(new Date(task.dueDate), "MMM d, yyyy")}
                                                            </div>
                                                        )}
                                                        {task.assignedTo && (
                                                            <div className="flex items-center gap-1">
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarImage src={task.assignedTo.avatarUrl || undefined} />
                                                                    <AvatarFallback className="text-[9px]">
                                                                        {task.assignedTo.fullName?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span>{task.assignedTo.fullName}</span>
                                                            </div>
                                                        )}
                                                        {task.contact && (
                                                            <div className="flex items-center gap-1 text-primary/80">
                                                                <span>@ {task.contact.firstName} {task.contact.lastName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(task)}>
                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task.id)}>
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <TaskDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                task={selectedTask}
                organizationId={profile?.organizationId || ""}
            />
        </div>
    );
}
