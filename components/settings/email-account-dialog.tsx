"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Mail, Server, Shield } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSaveEmailAccount } from "@/hooks/use-email";
import type { SMTPConfig } from "@/types";
import { useEffect } from "react";

interface EmailAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: SMTPConfig | null;
    orgId: string;
}

export function EmailAccountDialog({
    open,
    onOpenChange,
    account,
    orgId
}: EmailAccountDialogProps) {
    const { trigger: saveAccount, isMutating: isSaving } = useSaveEmailAccount();

    const form = useForm({
        defaultValues: {
            host: "",
            port: 587,
            username: "",
            password: "",
            fromName: "",
            fromEmail: "",
            useTls: true,
        }
    });

    useEffect(() => {
        if (account && open) {
            form.reset({
                host: account.host,
                port: account.port,
                username: account.username,
                password: "", // Don't populate password
                fromName: account.fromName || "",
                fromEmail: account.fromEmail || "",
                useTls: account.useTls,
            });
        } else if (!account && open) {
            form.reset({
                host: "",
                port: 587,
                username: "",
                password: "",
                fromName: "",
                fromEmail: "",
                useTls: true,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (data: any) => {
        try {
            await saveAccount({
                id: account?.id,
                orgId,
                ...data
            });
            toast.success(account ? "Account updated successfully" : "Account added successfully");
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save account");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        {account ? "Edit Email Account" : "Add Email Account"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure your SMTP settings for sending emails.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            SMTP Settings (Sending)
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input id="host" {...form.register("host")} placeholder="smtp.gmail.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">SMTP Port</Label>
                                <Input id="port" type="number" {...form.register("port", { valueAsNumber: true })} placeholder="587" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">SMTP Username</Label>
                                <Input id="username" {...form.register("username")} placeholder="user@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">SMTP Password</Label>
                                <Input id="password" type="password" {...form.register("password")} placeholder={account ? "•••••••• (hidden)" : "Password"} required={!account} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fromName">Display Name</Label>
                                <Input id="fromName" {...form.register("fromName")} placeholder="John Doe" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fromEmail">Email Address</Label>
                                <Input id="fromEmail" type="email" {...form.register("fromEmail")} placeholder="john@example.com" required />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Use TLS/SSL
                            </Label>
                            <p className="text-xs text-muted-foreground">Require secure connection (recommended)</p>
                        </div>
                        <Switch
                            checked={form.watch("useTls")}
                            onCheckedChange={(val) => form.setValue("useTls", val)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {account ? "Update Account" : "Add Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
