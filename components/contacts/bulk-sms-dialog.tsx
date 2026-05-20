"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";

interface BulkSmsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contactIds: string[];
    isSelectAllMatching: boolean;
    totalMatches: number;
    filters?: Record<string, string>;
    onSuccess: () => void;
}

export function BulkSmsDialog({
    open,
    onOpenChange,
    contactIds,
    isSelectAllMatching,
    totalMatches,
    filters,
    onSuccess
}: BulkSmsDialogProps) {
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const recipientCount = isSelectAllMatching ? totalMatches : contactIds.length;

    const handleSend = async () => {
        if (!message.trim()) {
            toast.error("Message body is required");
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch("/api/sms/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    contactIds: isSelectAllMatching ? [] : contactIds,
                    isSelectAllMatching,
                    filters: isSelectAllMatching ? filters : undefined
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to enqueue bulk SMS");
            }

            const data = await response.json();
            toast.success(`Successfully queued ${data.queuedCount} SMS for sending`);
            setMessage("");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to queue SMS");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Send Bulk SMS
                    </DialogTitle>
                    <DialogDescription>
                        Compose an SMS to send to <strong>{recipientCount}</strong> selected contacts.
                        You can use {'{{first_name}}'} and {'{{last_name}}'} as variables.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Type your message here... Example: Hi {{first_name}},"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSending}
                            className="min-h-[150px] resize-none"
                            maxLength={1600}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {message.length} characters ({(Math.ceil(message.length / 160) || 1)} segment{(Math.ceil(message.length / 160) || 1) !== 1 ? 's' : ''})
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={isSending || !message.trim()}>
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Queue {recipientCount} SMS
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
