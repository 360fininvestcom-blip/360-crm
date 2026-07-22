"use client";


import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useCreateEmailTemplate, useUpdateEmailTemplate } from "@/hooks/use-data";
import { toast } from "sonner";
import type { EmailTemplate } from "@/types";
import { Loader2, Code2 } from "lucide-react";

const templateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    subject: z.string().min(1, "Subject is required"),
    bodyHtml: z.string().min(1, "Email body is required"),
    bodyText: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: EmailTemplate | null;
    organizationId: string;
}

export function TemplateDialog({
    open,
    onOpenChange,
    template,
    organizationId,
}: TemplateDialogProps) {
    const isEditing = !!template;
    const [showHtml, setShowHtml] = useState(false);
    const { trigger: createTemplate, isMutating: isCreating } = useCreateEmailTemplate();
    const { trigger: updateTemplate, isMutating: isUpdating } = useUpdateEmailTemplate();
    const isLoading = isCreating || isUpdating;

    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateSchema) as any,
        defaultValues: {
            name: "",
            subject: "",
            bodyHtml: "",
            bodyText: "",
        },
    });

    useEffect(() => {
        if (template) {
            form.reset({
                name: template.name,
                subject: template.subject,
                bodyHtml: template.bodyHtml || "",
                bodyText: template.bodyText || "",
            });
        } else {
            form.reset({
                name: "",
                subject: "",
                bodyHtml: "",
                bodyText: "",
            });
        }
    }, [template, form]);

    const onSubmit = async (values: TemplateFormValues) => {
        try {
            if (isEditing && template) {
                await updateTemplate({
                    id: template.id,
                    updates: values as any,
                });
                toast.success("Template updated successfully");
            } else {
                await createTemplate({
                    ...values,
                    organizationId,
                } as any);
                toast.success("Template created successfully");
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Failed to save template:", error);
            toast.error("Failed to save template");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Template" : "Create Template"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update your email template"
                            : "Create a new email template for your sequences"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                        <FormField
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Template Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Welcome Email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject Line</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., Welcome to {{company_name}}!"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="bodyHtml"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Email Body {showHtml && <span className="text-xs text-muted-foreground ml-2">(HTML Mode)</span>}</FormLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 text-xs", showHtml ? "bg-muted font-bold" : "")}
                                            onClick={() => setShowHtml(!showHtml)}
                                        >
                                            <Code2 className="mr-2 h-3 w-3" />
                                            Code View
                                        </Button>
                                    </div>
                                    <FormControl>
                                        <Textarea
                                            placeholder={showHtml ? "<html><body>...</body></html>" : "Write your email content..."}
                                            className={cn("min-h-[200px]", showHtml ? "font-mono text-xs" : "text-sm")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="bodyText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plain Text Version (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Plain text fallback..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
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
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEditing ? "Save Changes" : "Create Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
