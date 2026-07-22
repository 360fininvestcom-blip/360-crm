"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, Star, StarOff } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSipAccounts, useDeleteSipAccount, useSetDefaultSipAccount } from "@/hooks/use-settings";
import { SipAccountDialog } from "./sip-account-dialog";
import type { SIPProfile } from "@/types";
import { toast } from "sonner";
import { mutate } from "swr";

interface SipAccountManagerProps {
    userId: string;
    orgId: string;
}

export function SipAccountManager({ userId, orgId }: SipAccountManagerProps) {
    const { data: accounts, isLoading } = useSipAccounts(userId);
    const { trigger: deleteAccount } = useDeleteSipAccount();
    const { trigger: setDefault } = useSetDefaultSipAccount();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<SIPProfile | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<SIPProfile | null>(null);

    const handleEdit = (account: SIPProfile) => {
        setSelectedAccount(account);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedAccount(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!accountToDelete) return;

        try {
            await deleteAccount(accountToDelete.id);
            toast.success("SIP account deleted");
            setAccountToDelete(null);
            // Refresh accounts list
            mutate(`sip-accounts-${userId}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to delete account";
            toast.error(errorMessage);
        }
    };

    const handleSetDefault = async (account: SIPProfile) => {
        try {
            await setDefault({ id: account.id, userId });
            toast.success(`${account.displayName} is now your default SIP account`);
            // Refresh accounts list
            mutate(`sip-accounts-${userId}`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to set default";
            toast.error(errorMessage);
        }
    };

    const handleDialogSuccess = () => {
        // Refresh accounts list
        mutate(`sip-accounts-${userId}`);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        SIP Accounts
                    </CardTitle>
                    <CardDescription>
                        Manage your SIP accounts for making and receiving calls.
                    </CardDescription>
                </div>
                <Button onClick={handleAdd} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Account
                </Button>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead>SIP User</TableHead>
                                <TableHead>Domain</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Loading accounts...
                                    </TableCell>
                                </TableRow>
                            ) : accounts?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No SIP accounts configured. Click &quot;Add Account&quot; to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts?.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span>{account.displayName || "SIP Account"}</span>
                                                    {account.isDefault && (
                                                        <Badge variant="secondary" className="gap-1 text-xs">
                                                            <Star className="h-3 w-3" />
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {account.displayName}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{account.sipUsername}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {account.sipDomain}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={account.isActive ? "default" : "destructive"}>
                                                {account.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {!account.isDefault && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleSetDefault(account)}
                                                        title="Set as default"
                                                    >
                                                        <StarOff className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(account)}
                                                    title="Edit account"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setAccountToDelete(account)}
                                                    title="Delete account"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <SipAccountDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                account={selectedAccount}
                userId={userId}
                orgId={orgId}
                onSuccess={handleDialogSuccess}
            />

            <Dialog open={!!accountToDelete} onOpenChange={(open: boolean) => !open && setAccountToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete SIP Account?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the SIP account <strong>&quot;{accountToDelete?.displayName}&quot;</strong>.
                            You will not be able to make calls using this account.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAccountToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
