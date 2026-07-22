"use client";

import { useState } from "react";
import { useActiveProfile } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { mutate } from "swr";

interface InviteMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function InviteMemberDialog({
    open,
    onOpenChange,
    onSuccess,
}: InviteMemberDialogProps) {
    const { data: activeProfile } = useActiveProfile();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "manager" | "agent" | "viewer">("agent");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeProfile?.organizationId) {
            toast.error("Organization ID not found");
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate a temporary password for the invited user
            const tempPassword = `Welcome${Math.random().toString(36).slice(-8)}!`;

            const response = await fetch("/api/team/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password: tempPassword,
                    full_name: fullName,
                    role,
                    organizationId: activeProfile?.organizationId || "",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to invite member");
            }

            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-medium">{fullName} invited successfully!</span>
                    <span className="text-xs text-muted-foreground">
                        Temporary password: <code className="bg-muted px-1 py-0.5 rounded">{tempPassword}</code>
                    </span>
                </div>,
                { duration: 10000 }
            );

            // Reset form
            setFullName("");
            setEmail("");
            setRole("agent");

            // Refresh profiles list
            mutate("profiles");

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Invite error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send invitation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleInvite}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Invite Member
                        </DialogTitle>
                        <DialogDescription>
                            Create an account for a new team member. A temporary password will be generated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={role}
                                onValueChange={(value: "admin" | "manager" | "agent" | "viewer") => setRole(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create & Invite
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
