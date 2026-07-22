"use client";

import { useState, useRef } from "react";
import { Upload, AlertCircle, Download, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBulkCreateContacts } from "@/hooks/use-data";
import Papa from "papaparse";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    ownerId?: string;
    onSuccess?: () => void;
}

export function ImportDialog({
    open,
    onOpenChange,
    organizationId,
    ownerId,
    onSuccess,
}: ImportDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Record<string, string>[]>([]);
    const { trigger: bulkCreate, isMutating: isImporting } = useBulkCreateContacts();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "text/csv") {
                toast.error("Only CSV files are accepted");
                return;
            }
            setFile(selectedFile);

            // Parse for preview
            Papa.parse(selectedFile, {
                header: true,
                preview: 5,
                complete: (results) => {
                    setPreview(results.data as Record<string, string>[]);
                },
            });
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ["first_name", "last_name", "email", "phone", "company", "job_title", "status", "lead_score"];
        const sampleRows = [
            ["John", "Doe", "john@example.com", "+123456789", "Acme Corp", "Manager", "new", "85"],
            ["Jane", "Smith", "jane@example.com", "+987654321", "Globex", "CEO", "qualified", "95"]
        ];

        const csvContent = [headers, ...sampleRows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "contacts_import_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const contactsToCreate = (results.data as Record<string, string>[]).map((row) => ({
                    organizationId: organizationId,
                    firstName: row.first_name || row.firstName || "Unknown",
                    lastName: row.last_name || row.lastName || null,
                    email: row.email || null,
                    phone: row.phone || null,
                    company: row.company || null,
                    jobTitle: row.job_title || row.jobTitle || null,
                    status: row.status || "new",
                    source: null,
                    lastCallStatus: null,
                    lastCallAt: null,
                    ownerId: ownerId || null, // Assign to the agent importing
                    leadScore: Number(row.lead_score || row.leadScore) || 0,
                    tags: [],
                    customFields: {},
                }));

                if (contactsToCreate.length === 0) {
                    toast.error("No valid contacts found in CSV");
                    return;
                }

                try {
                    await bulkCreate(contactsToCreate);
                    toast.success(`Successfully imported ${contactsToCreate.length} contacts`);
                    onOpenChange(false);
                    onSuccess?.();
                    setFile(null);
                    setPreview([]);
                } catch (error) {
                    const err = error as { message?: string; details?: string; hint?: string; code?: string };
                    console.error("Import error details:", {
                        message: err.message,
                        details: err.details,
                        hint: err.hint,
                        code: err.code,
                        error
                    });
                    toast.error(`Import failed: ${err.message || "Please check your file format"}`);
                }
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Import Contacts</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import contacts into your CRM.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 max-h-[calc(90vh-180px)]">
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 space-y-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                                aria-label="Upload CSV file"
                            />
                            <div className="p-4 rounded-full bg-primary/10">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    {file ? file.name : "Click to select or drag and drop CSV file"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only .csv files are supported
                                </p>
                            </div>
                            {file && (
                                <Button variant="outline" size="sm" onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setPreview([]);
                                }}>
                                    Change File
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Sample Data Format</Label>
                                <Button variant="link" size="sm" className="h-auto p-0" onClick={handleDownloadTemplate}>
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    Download Template
                                </Button>
                            </div>

                            {preview.length > 0 ? (
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="text-[10px] uppercase font-bold py-2">First Name</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold py-2">Email</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold py-2">Company</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold py-2">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="text-xs py-2">{row.first_name}</TableCell>
                                                    <TableCell className="text-xs py-2">{row.email}</TableCell>
                                                    <TableCell className="text-xs py-2">{row.company}</TableCell>
                                                    <TableCell className="text-xs py-2">{row.status}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <AlertCircle className="h-4 w-4 text-primary" />
                                        Requirements
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Your CSV must contain the following required header: <code className="bg-muted px-1 rounded font-mono">first_name</code>.
                                        Optional headers include: last_name, email, phone, company, status, lead_score.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 border-t mt-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isImporting}>
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Start Import"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
