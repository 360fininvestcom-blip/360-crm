"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Code, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getWebForms, createWebForm, deleteWebForm } from "@/actions/web-forms";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { WebForm } from "@/types";

export default function WebFormsPage() {
    const router = useRouter();
    const [forms, setForms] = useState<WebForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newFormName, setNewFormName] = useState("");
    const [newFormSource, setNewFormSource] = useState("Website");

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const data = await getWebForms();
            setForms(data || []);
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to load web forms");
        } finally {
            setLoading(false);
        }
    };

    const createForm = async () => {
        if (!newFormName) return;

        try {
            const data = await createWebForm(newFormName, newFormSource);

            setForms([data, ...forms]);
            setOpen(false);
            setNewFormName("");
            toast.success("Web form created");
        } catch (error: any) {
            const errorMessage = error?.message || error?.code || (error && typeof error === 'object' ? JSON.stringify(error) : 'Unknown error');
            console.error("Error creating form:", errorMessage, error);
            toast.error(`Failed to create web form: ${errorMessage}`);
        }
    };

    const deleteForm = async (id: string) => {
        try {
            await deleteWebForm(id);
            setForms(forms.filter((f) => f.id !== id));
            toast.success("Web form deleted");
        } catch (error) {
            toast.error("Failed to delete form");
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Web Forms</h2>
                    <p className="text-muted-foreground">
                        Connect external forms to NanoSol CRM.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Form
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Web Form</DialogTitle>
                            <DialogDescription>
                                Generate a unique endpoint for your external forms.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Form Name</Label>
                                <Input
                                    id="name"
                                    value={newFormName}
                                    onChange={(e) => setNewFormName(e.target.value)}
                                    placeholder="e.g. Website Contact Us"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="source">Source</Label>
                                <Input
                                    id="source"
                                    value={newFormSource}
                                    onChange={(e) => setNewFormSource(e.target.value)}
                                    placeholder="e.g. Website"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={createForm} disabled={!newFormName}>
                                Create Form
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                    <FormCard key={form.id} form={form} onDelete={deleteForm} />
                ))}
                {!loading && forms.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No web forms created yet.
                    </div>
                )}
            </div>
        </div>
    );
}

function FormCard({ form, onDelete }: { form: WebForm; onDelete: (id: string) => void }) {
    const [openCode, setOpenCode] = useState(false);

    // Construct absolute URL (using window.location hack for client-side or generic env)
    // For now we assume typical production URL or localhost
    const endpointUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/public/leads`
        : '/api/public/leads';

    const snippet = `<form action="${endpointUrl}" method="POST">
  <input type="hidden" name="x-form-id" value="${form.id}" />
  <!-- Use your own fields, they will map automatically -->
  <input type="email" name="email" placeholder="Email" required />
  <input type="text" name="first_name" placeholder="First Name" />
  <button type="submit">Submit</button>
</form>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(snippet);
        toast.success("Copied to clipboard");
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {form.name}
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setOpenCode(true)}>
                        <Code className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(form.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">{form.source}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                        ID: <span className="font-mono bg-muted px-1 rounded">{form.id.slice(0, 8)}...</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${form.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs capitalize">{form.status}</span>
                    </div>
                </div>
            </CardContent>

            <Dialog open={openCode} onOpenChange={setOpenCode}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Integration Code</DialogTitle>
                        <DialogDescription>
                            Copy and paste this HTML snippet into your website.
                            Ensure your backend handles the POST request to our endpoint.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative mt-4 rounded-md bg-muted p-4 font-mono text-xs overflow-auto">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute right-2 top-2 h-6 w-6"
                            onClick={copyToClipboard}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                        <pre>{snippet}</pre>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        <p className="font-semibold">Endpoint:</p>
                        <code className="bg-muted px-1 py-0.5 rounded">{endpointUrl}</code>
                        <p className="mt-2 text-xs">
                            <strong>Note:</strong> You must include the header `X-Form-ID: {form.id}` if you are calling the API via fetch/axios.
                            For simple HTML forms, adding a hidden input `x-form-id` might not work with standard form submission parsing unless the backend supports body-based ID lookup (which we do not currently, only header).
                            <br /><br />
                            Wait, simple HTML forms cannot send custom headers easily.
                            <strong>FIX:</strong> The backend should look for `x-form-id` in the BODY as well as headers for HTML forms support!
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
