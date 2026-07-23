"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { useCreateDeal, useUpdateDeal, useContacts, useActiveProfile } from "@/hooks/use-data";
import type { Deal } from "@/types";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DealFormData {
    name: string;
    value: number;
    stage: string;
    probability: number;
    contactId: string;
    expectedCloseDate: string;
}

interface DealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deal?: Deal | null;
    pipelineId: string;
    organizationId: string;
    stages: { id: string; name: string }[];
    onSuccess?: () => void;
}

export function DealDialog({
    open,
    onOpenChange,
    deal,
    pipelineId,
    organizationId,
    stages,
    onSuccess,
}: DealDialogProps) {
    const isEditing = !!deal;
    const { data: contacts } = useContacts();
    const { data: activeProfile } = useActiveProfile();
    const isAgent = activeProfile?.role === "agent";
    const { trigger: createDeal, isMutating: isCreating } = useCreateDeal();
    const { trigger: updateDeal, isMutating: isUpdating } = useUpdateDeal();

    const [contactPopoverOpen, setContactPopoverOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        control,
        formState: { errors },
    } = useForm<DealFormData>({
        defaultValues: deal
            ? {
                name: deal.name,
                value: deal.value as any,
                stage: deal.stage,
                probability: deal.probability,
                contactId: deal.contactId || "none",
                expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : "",
            }
            : {
                name: "",
                value: 0,
                stage: stages[0]?.id || "lead",
                probability: 10,
                contactId: "none",
                expectedCloseDate: "",
            },
    });

    useEffect(() => {
        if (deal) {
            reset({
                name: deal.name,
                value: deal.value as any,
                stage: deal.stage,
                probability: deal.probability,
                contactId: deal.contactId || "none",
                expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split('T')[0] : "",
            });
        } else {
            reset({
                name: "",
                value: 0,
                stage: stages[0]?.id || "lead",
                probability: 10,
                contactId: "none",
                expectedCloseDate: "",
            });
        }
    }, [deal, reset, stages]);

    const selectedStage = useWatch({
        control,
        name: "stage",
    });

    const watchedContactId = useWatch({
        control,
        name: "contactId",
    });

    // Derive the display name for the selected contact
    const selectedContactLabel = useMemo(() => {
        if (!watchedContactId || watchedContactId === "none") return "No contact";
        const contact = contacts?.find((c) => c.id === watchedContactId);
        if (!contact) return "No contact";
        return `${contact.firstName} ${contact.lastName || ""}${contact.company ? ` - ${contact.company}` : ""}`;
    }, [watchedContactId, contacts]);

    const onSubmit = async (data: DealFormData) => {
        try {
            if (isEditing && deal) {
                await updateDeal({
                    id: deal.id,
                    updates: {
                        ...(data as any),
                        value: Number(data.value) as any,
                        probability: Number(data.probability),
                        contactId: data.contactId === "none" ? null : data.contactId,
                    },
                });
                toast.success("Deal updated successfully");
            } else {
                await createDeal({
                    ...(data as any),
                    organization_id: organizationId,
                    pipeline_id: pipelineId,
                    value: Number(data.value) as any,
                    probability: Number(data.probability),
                    contactId: data.contactId === "none" ? null : data.contactId,
                    expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
                    currency: "USD",
                    owner_id: activeProfile?.id || null,
                });
                toast.success("Deal created successfully");
            }
            reset();
            onOpenChange(false);
            onSuccess?.();
        } catch (error: unknown) {
            console.error("Error saving deal:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to save deal";
            toast.error(`Error: ${errorMessage}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Deal" : "Add New Deal"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the deal information."
                            : "Fill in the details to create a new deal."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="space-y-2">
                        <Label htmlFor="name">Deal Name *</Label>
                        <Input
                            id="name"
                            {...register("name", { required: "Deal name is required" })}
                            placeholder="Enterprise Agreement"
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="value">Value ($)</Label>
                            <Input
                                id="value"
                                type="number"
                                step="0.01"
                                {...register("value", { min: 0 })}
                                placeholder="50000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="probability">Probability (%)</Label>
                            <Input
                                id="probability"
                                type="number"
                                min="0"
                                max="100"
                                {...register("probability", { min: 0, max: 100 })}
                                placeholder="50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select
                            value={selectedStage}
                            onValueChange={(value) => setValue("stage", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Contact</Label>
                        <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={contactPopoverOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate">{selectedContactLabel}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search contacts..." />
                                    <CommandList>
                                        <CommandEmpty>No contacts found.</CommandEmpty>
                                        <CommandGroup>
                                            {!isAgent && (
                                                <CommandItem
                                                    value="none"
                                                    onSelect={() => {
                                                        setValue("contactId", "none");
                                                        setContactPopoverOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            watchedContactId === "none" ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    No contact
                                                </CommandItem>
                                            )}
                                            {Array.isArray(contacts) && contacts.map((contact) => {
                                                const label = `${contact.firstName} ${contact.lastName || ""}${contact.company ? ` - ${contact.company}` : ""}`;
                                                return (
                                                    <CommandItem
                                                        key={contact.id}
                                                        value={label}
                                                        onSelect={() => {
                                                            setValue("contactId", contact.id);
                                                            setContactPopoverOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                watchedContactId === contact.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {label}
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {isAgent && watchedContactId === "none" && (
                            <p className="text-xs text-destructive">Agents must link a contact to create a deal.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                        <Input
                            id="expectedCloseDate"
                            type="date"
                            {...register("expectedCloseDate")}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating || isUpdating || (isAgent && watchedContactId === "none")}>
                            {isCreating || isUpdating
                                ? "Saving..."
                                : isEditing
                                    ? "Update Deal"
                                    : "Create Deal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
