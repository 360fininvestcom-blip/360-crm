"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Phone, Server, Star, Globe } from "lucide-react";
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
import { useSaveSipAccount } from "@/hooks/use-settings";
import type { SIPProfile } from "@/types";

interface SipAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account?: SIPProfile | null;
    userId: string;
    orgId: string;
    onSuccess?: () => void;
}

interface SipFormData {
    name: string;
    display_name: string;
    sip_username: string;
    sip_auth_user: string;
    sip_password: string;
    sip_domain: string;
    ws_server: string;
    sip_protocol: string;
    outbound_proxy: string;
    registrar_server: string;
    engine: "janus" | "crococall" | "jssip";
    is_default: boolean;
}

export function SipAccountDialog({
    open,
    onOpenChange,
    account,
    userId,
    orgId,
    onSuccess
}: SipAccountDialogProps) {
    const { trigger: saveAccount, isMutating: isSaving } = useSaveSipAccount();
    const isEditing = !!account;

    const form = useForm<SipFormData>({
        defaultValues: {
            name: "",
            display_name: "",
            sip_username: "",
            sip_auth_user: "",
            sip_password: "",
            sip_domain: "",
            ws_server: "",
            sip_protocol: "wss",
            outbound_proxy: "",
            registrar_server: "",
            engine: "janus",
            is_default: false,
        }
    });

    useEffect(() => {
        if (account && open) {
            form.reset({
                name: account.name || "",
                display_name: account.display_name || "",
                sip_username: account.sip_username || "",
                sip_auth_user: account.sip_auth_user || "",
                sip_password: "", // Don't populate password
                sip_domain: account.sip_domain || "",
                ws_server: account.websocket_server || "",
                sip_protocol: account.sip_protocol || "wss",
                outbound_proxy: account.outbound_proxy || "",
                registrar_server: account.registrar_server || "",
                engine: account.engine || "janus",
                is_default: account.is_default || false,
            });
        } else if (!account && open) {
            form.reset({
                name: "",
                display_name: "",
                sip_username: "",
                sip_password: "",
                sip_domain: "",
                outbound_proxy: "",
                registrar_server: "",
                engine: "janus",
                is_default: false,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (data: SipFormData) => {
        try {
            const accountData: Partial<SIPProfile> = {
                name: data.name || "SIP Account",
                display_name: data.display_name,
                sip_username: data.sip_username,
                sip_auth_user: data.sip_auth_user || undefined,
                sip_domain: data.sip_domain,
                websocket_server: undefined,
                sip_protocol: "wss",
                outbound_proxy: data.outbound_proxy || undefined,
                registrar_server: data.registrar_server || undefined,
                janus_url: "wss://sip.nanocall.space:8989", // Janus Secure WebSocket on port 8989
                engine: data.engine,
                is_default: data.is_default,
                is_active: true,
            };

            // Only include password if provided (for updates, empty means keep existing)
            if (data.sip_password) {
                accountData.sip_password_encrypted = data.sip_password; // Will be encrypted by backend
            }

            await saveAccount({
                id: account?.id,
                userId,
                orgId,
                data: accountData
            });

            toast.success(isEditing ? "SIP account updated" : "SIP account added");
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            console.error("Supabase Save Error:", error);
            const errObj = error as Record<string, unknown>;
            const errorMessage = errObj?.message || (typeof error === 'string' ? error : JSON.stringify(error));
            toast.error(`Error: ${errorMessage}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        {isEditing ? "Edit SIP Account" : "Add SIP Account"}
                    </DialogTitle>
                    <DialogDescription>
                        Configure your SIP credentials for making and receiving calls.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Account Name</Label>
                            <Input
                                id="name"
                                {...form.register("name")}
                                placeholder="e.g. Work SIP, Personal Line"
                            />
                            <p className="text-xs text-muted-foreground">A friendly name to identify this account</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="engine">Call Engine / Provider</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={form.watch("engine") === "janus" ? "default" : "outline"}
                                    className="justify-start gap-2"
                                    onClick={() => form.setValue("engine", "janus")}
                                >
                                    <Server className="h-4 w-4" />
                                    Janus Bridge
                                </Button>
                                <Button
                                    type="button"
                                    variant={form.watch("engine") === "crococall" ? "default" : "outline"}
                                    className="justify-start gap-2"
                                    onClick={() => form.setValue("engine", "crococall")}
                                >
                                    <Globe className="h-4 w-4" />
                                    Crococall API
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {form.watch("engine") === "janus" 
                                    ? "Recommended. Uses our high-performance secure bridge." 
                                    : "Direct connection to Crococall WebRTC services."}
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    Set as Default
                                </Label>
                                <p className="text-xs text-muted-foreground">Use this account for outbound calls by default</p>
                            </div>
                            <Switch
                                checked={form.watch("is_default")}
                                onCheckedChange={(val) => form.setValue("is_default", val)}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            SIP Credentials
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="display_name">Display Name (Caller ID)</Label>
                                <Input
                                    id="display_name"
                                    {...form.register("display_name")}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_username">SIP Username (Extension)</Label>
                                <Input
                                    id="sip_username"
                                    {...form.register("sip_username")}
                                    placeholder="e.g. 1001"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_auth_user">Authorization Username (Optional)</Label>
                                <Input
                                    id="sip_auth_user"
                                    {...form.register("sip_auth_user")}
                                    placeholder="e.g. auth1001"
                                />
                                <p className="text-[10px] text-muted-foreground">Often different from extension for complex providers</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_password">SIP Password</Label>
                                <Input
                                    id="sip_password"
                                    type="password"
                                    {...form.register("sip_password")}
                                    placeholder={isEditing ? "•••••••• (hidden)" : "Password"}
                                    required={!isEditing}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sip_domain">SIP Domain (Registrar)</Label>
                                <Input
                                    id="sip_domain"
                                    {...form.register("sip_domain")}
                                    placeholder="sip.provider.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="outbound_proxy">Outbound Proxy (Optional)</Label>
                                <Input
                                    id="outbound_proxy"
                                    {...form.register("outbound_proxy")}
                                    placeholder="sip:proxy.provider.com:5060"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
                        <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            Universal WebRTC Bridge Active
                        </h5>
                        <p className="text-[10px] text-blue-600/90 leading-relaxed">
                            Your secure Janus Gateway (<strong>wss://sip.nanocall.space/janus/</strong>) is automatically handling the WebSocket translation for this SIP account.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Update Account" : "Add Account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
