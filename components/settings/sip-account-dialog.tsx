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
    displayName: string;
    sipUsername: string;
    sipPassword: string;
    sipDomain: string;
    outboundProxy: string;
    isDefault: boolean;
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
            displayName: "",
            sipUsername: "",
            sipPassword: "",
            sipDomain: "",
            outboundProxy: "",
            isDefault: false,
        }
    });

    useEffect(() => {
        if (account && open) {
            form.reset({
                displayName: account.displayName || "",
                sipUsername: account.sipUsername || "",
                sipPassword: "", // Don't populate password
                sipDomain: account.sipDomain || "",
                outboundProxy: account.outboundProxy || "",
                isDefault: account.isDefault || false,
            });
        } else if (!account && open) {
            form.reset({
                displayName: "",
                sipUsername: "",
                sipPassword: "",
                sipDomain: "",
                outboundProxy: "",
                isDefault: false,
            });
        }
    }, [account, open, form]);

    const onSubmit = async (data: SipFormData) => {
        try {
            const accountData: Partial<SIPProfile> = {
                displayName: data.displayName,
                sipUsername: data.sipUsername,
                sipDomain: data.sipDomain,
                outboundProxy: data.outboundProxy || null,
                isDefault: data.isDefault,
                isActive: account ? account.isActive : true, // Preserve active status or default to true
            };

            // Only add password if it was changed or it's a new account
            if (data.sipPassword) {
                // The API will encrypt this
                accountData.sipPasswordEncrypted = data.sipPassword;
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
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    Set as Default
                                </Label>
                                <p className="text-xs text-muted-foreground">Use this account for outbound calls by default</p>
                            </div>
                            <Switch
                                checked={form.watch("isDefault")}
                                onCheckedChange={(val) => form.setValue("isDefault", val)}
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
                                <Label htmlFor="displayName">Display Name (Caller ID)</Label>
                                <Input
                                    id="displayName"
                                    {...form.register("displayName")}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sipUsername">SIP Username (Extension)</Label>
                                <Input
                                    id="sipUsername"
                                    {...form.register("sipUsername")}
                                    placeholder="e.g. 1001"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sipPassword">SIP Password</Label>
                                <Input
                                    id="sipPassword"
                                    type="password"
                                    {...form.register("sipPassword")}
                                    placeholder={isEditing ? "•••••••• (hidden)" : "Password"}
                                    required={!isEditing}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sipDomain">SIP Domain (Registrar)</Label>
                                <Input
                                    id="sipDomain"
                                    {...form.register("sipDomain")}
                                    placeholder="sip.provider.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="outboundProxy">Outbound Proxy (Optional)</Label>
                                <Input
                                    id="outboundProxy"
                                    {...form.register("outboundProxy")}
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
