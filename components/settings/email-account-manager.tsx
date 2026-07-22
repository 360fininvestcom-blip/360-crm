"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, ExternalLink, ShieldCheck, User } from "lucide-react";
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
import { useSMTPConfigs, useDeleteEmailAccount } from "@/hooks/use-email";
import { EmailAccountDialog } from "./email-account-dialog";
import { SMTPConfig } from "@/types";
import { toast } from "sonner";

interface EmailAccountManagerProps {
    orgId: string;
}

export function EmailAccountManager({ orgId }: EmailAccountManagerProps) {
    const { data: accounts, isLoading } = useSMTPConfigs();
    const { trigger: deleteAccount } = useDeleteEmailAccount();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<SMTPConfig | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<SMTPConfig | null>(null);

    const handleEdit = (account: SMTPConfig) => {
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
            toast.success("Account deleted successfully");
            setAccountToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete account");
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Accounts
                    </CardTitle>
                    <CardDescription>
                        Manage SMTP and IMAP accounts for sending and receiving emails.
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
                                <TableHead>Name</TableHead>
                                <TableHead>Email Address</TableHead>
                                <TableHead>SMTP Host</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Loading accounts...
                                    </TableCell>
                                </TableRow>
                            ) : accounts?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No email accounts configured.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts?.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{account.fromName || account.fromEmail}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{account.fromEmail}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {account.host}:{account.port}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="gap-1">
                                                <ShieldCheck className="h-3 w-3" />
                                                Org Wide
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default">
                                                Active
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
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

            <EmailAccountDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                account={selectedAccount}
                orgId={orgId}
            />

            <Dialog open={!!accountToDelete} onOpenChange={(open: boolean) => !open && setAccountToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the email account <span className="font-semibold">{accountToDelete?.fromEmail}</span>?
                            Any scheduled emails or sequences relying on this account may fail.
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
