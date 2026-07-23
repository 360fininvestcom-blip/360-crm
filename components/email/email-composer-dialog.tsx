"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates, useActiveProfile, useSMTPConfigs } from "@/hooks/use-data";
import { toast } from "sonner";
import { Loader2, Send, Sparkles, Code2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

const formSchema = z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Message body is required"),
    account_id: z.string().min(1, "Please select an email account"),
});

interface EmailComposerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTo?: string;
    organizationId: string;
}

export function EmailComposerDialog({
    open,
    onOpenChange,
    defaultTo = "",
}: EmailComposerDialogProps) {
    const [isSending, setIsSending] = useState(false);
    const { data: templates } = useEmailTemplates();
    const { data: profile } = useActiveProfile();
    const { data: accounts } = useSMTPConfigs();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            to: defaultTo,
            subject: "",
            body: "",
            account_id: "",
        },
    });

    // Auto-select first account if available
    useEffect(() => {
        if (accounts && accounts.length > 0 && !form.getValues("account_id")) {
            form.setValue("account_id", accounts[0].id);
        }
    }, [accounts, form]);

    // Sync defaultTo when it changes
    useEffect(() => {
        if (open && defaultTo) {
            form.setValue("to", defaultTo);
        }
    }, [open, defaultTo, form]);

    const handleTemplateSelect = (templateId: string) => {
        const template = templates?.find((t) => t.id === templateId);
        if (template) {
            form.setValue("subject", template.subject);
            // If in HTML mode, use full HTML. If text mode, strip tags or keep simple.
            // For now, always set the raw body, and let the view decide how to show it.
            form.setValue("body", template.bodyHtml);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSending(true);
        try {
            const res = await fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: values.to,
                    subject: values.subject,
                    body_html: values.body,
                    account_id: values.account_id
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send email");
            }

            toast.success("Email sent successfully");
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Send Error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send email");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                    <DialogDescription>
                        Send a new email or use a template.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From Account</Label>
                            <Select
                                value={form.watch("account_id")}
                                onValueChange={(val) => form.setValue("account_id", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(accounts) && accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.fromName || "Unknown"} &lt;{acc.fromEmail}&gt;
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.account_id && (
                                <p className="text-[0.8rem] font-medium text-destructive">
                                    {form.formState.errors.account_id.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Template</Label>
                            <Select onValueChange={handleTemplateSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Load template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(templates) && templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>To</FormLabel>
                                    <FormControl>
                                        <Input placeholder="recipient@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Email subject" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between mb-2">
                                        <FormLabel>Message</FormLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-primary/80 hover:text-primary"
                                            onClick={async () => {
                                                const subject = form.getValues("subject");
                                                if (!subject) {
                                                    toast.error("Please enter a subject first");
                                                    return;
                                                }
                                                const toastId = toast.loading("AI is drafting your email...");
                                                // Simulate AI generation
                                                await new Promise(r => setTimeout(r, 2000));
                                                const draft = `Hi,<br/><br/>I'm writing to you regarding "<strong>${subject}</strong>".<br/><br/>I would like to discuss next steps and see how we can move forward with our proposal. Please let me know your availability for a brief call this week.<br/><br/>Best regards,<br/>${profile?.fullName || 'The Team'}`;
                                                form.setValue("body", draft);
                                                toast.success("Draft generated!", { id: toastId });
                                            }}
                                        >
                                            <Sparkles className="mr-2 h-3 w-3" />
                                            Draft with AI
                                        </Button>
                                    </div>
                                    <FormControl>
                                        <Tabs defaultValue="code" className="w-full">
                                            <TabsList className="grid w-full grid-cols-3 mb-2">
                                                <TabsTrigger value="code">
                                                    <Code2 className="mr-2 h-3.5 w-3.5" />
                                                    Code (HTML)
                                                </TabsTrigger>
                                                <TabsTrigger value="preview">
                                                    <span className="mr-2">👁️</span>
                                                    Preview
                                                </TabsTrigger>
                                                <TabsTrigger value="text">
                                                    <span className="mr-2">📝</span>
                                                    Plain Text
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="code" className="mt-0">
                                                <Textarea
                                                    placeholder="<html><body>...</body></html>"
                                                    className="min-h-[250px] font-mono text-xs bg-muted/30"
                                                    {...field}
                                                />
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    Edit raw HTML for full control.
                                                </p>
                                            </TabsContent>

                                            <TabsContent value="preview" className="mt-0">
                                                <div className="min-h-[250px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background overflow-auto prose prose-sm dark:prose-invert max-w-none">
                                                    {field.value ? (
                                                        <div dangerouslySetInnerHTML={{ __html: field.value }} />
                                                    ) : (
                                                        <div className="text-muted-foreground opacity-50 italic">
                                                            Nothing to preview...
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="text" className="mt-0">
                                                <Textarea
                                                    placeholder="Type plain text..."
                                                    className="min-h-[250px]"
                                                    value={field.value.replace(/<[^>]*>?/gm, "")}
                                                    onChange={(e) => {
                                                        field.onChange(e.target.value);
                                                    }}
                                                />
                                                <p className="text-[10px] text-muted-foreground mt-1 text-amber-500">
                                                    Warning: Editing here removes all HTML formatting.
                                                </p>
                                            </TabsContent>
                                        </Tabs>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Email
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
