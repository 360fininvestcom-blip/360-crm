"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    useContactStatuses,
    useCreateContactStatus,
    useDeleteContactStatus
} from "@/hooks/use-data";
import { Separator } from "@/components/ui/separator";

interface StatusManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

export function StatusManagementDialog({
    open,
    onOpenChange,
    organizationId,
}: StatusManagementDialogProps) {
    const { data: statuses, mutate } = useContactStatuses();
    const { trigger: createStatus } = useCreateContactStatus();
    const { trigger: deleteStatus } = useDeleteContactStatus();

    const [newStatusLabel, setNewStatusLabel] = useState("");

    const handleAddStatus = async () => {
        if (!newStatusLabel.trim()) return;

        try {
            await createStatus({
                organizationId: organizationId,
                name: newStatusLabel.toLowerCase().replace(/\s+/g, "_"),
                label: newStatusLabel,
                color: "gray",
                order: (statuses?.length || 0) + 1,
            });
            setNewStatusLabel("");
            toast.success("Status added");
            mutate();
        } catch (error) {
            console.error("Error adding status:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to add status: ${message}`);
        }
    };

    const handleDeleteStatus = async (id: string) => {
        if (id.startsWith("default-")) {
            toast.error("Default statuses cannot be deleted in this demo");
            return;
        }

        try {
            await deleteStatus(id);
            toast.success("Status deleted");
            mutate();
        } catch (error) {
            console.error("Error deleting status:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to delete status: ${message}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Contact Statuses</DialogTitle>
                    <DialogDescription>
                        Add, remove, or customize the statuses for your contacts.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Add New Status</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. In Progress"
                                value={newStatusLabel}
                                onChange={(e) => setNewStatusLabel(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddStatus()}
                            />
                            <Button onClick={handleAddStatus} size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label>Existing Statuses</Label>
                        <div className="space-y-2">
                            {statuses?.map((status) => (
                                <div
                                    key={status.id}
                                    className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                                >
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{status.label}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => handleDeleteStatus(status.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
