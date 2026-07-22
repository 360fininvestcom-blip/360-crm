"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getOrganizationApiKeys, createOrganizationApiKey, deleteOrganizationApiKey, getCrmApiKey, updateCrmApiKey } from "@/actions/developer";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Plus, Trash2, Key, ShieldAlert, RefreshCw, Globe } from "lucide-react";

interface ApiKey {
    id: string;
    label: string;
    key_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    created_at: string;
}

export default function DeveloperSettingsPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [crmApiKey, setCrmApiKey] = useState<string>("");
    const [isUpdatingCrmKey, setIsUpdatingCrmKey] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
        fetchKeys();
        fetchCrmKey();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCrmKey = async () => {
        try {
            const key = await getCrmApiKey();
            if (key) {
                setCrmApiKey(key);
            }
        } catch (e) {
            console.error("Error fetching CRM key:", e);
        }
    };

    const fetchKeys = async () => {
        try {
            const data = await getOrganizationApiKeys();
            setKeys(data || []);
        } catch (error) {
            console.error("Error fetching keys:", error);
            toast.error("Failed to load API keys");
        } finally {
            setLoading(false);
        }
    };

    const createKey = async () => {
        if (!newLabel) return;

        try {
            const data = await createOrganizationApiKey(newLabel);

            setGeneratedKey(data.apiKey);
            // Refresh list
            fetchKeys();
            toast.success("API Key generated");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to create key";
            toast.error(message);
        }
    };

    const deleteKey = async (id: string) => {
        if (!confirm("Are you sure? This will immediately revoke access for this key.")) return;
        try {
            await deleteOrganizationApiKey(id);

            setKeys(keys.filter((k) => k.id !== id));
            toast.success("API Key revoked");
        } catch {
            toast.error("Failed to revoke key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const updateCrmKey = async () => {
        setIsUpdatingCrmKey(true);
        try {
            await updateCrmApiKey(crmApiKey);
            toast.success("CRM API Key updated");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update CRM Key";
            toast.error(message);
        } finally {
            setIsUpdatingCrmKey(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Developer Settings</h2>
                    <p className="text-muted-foreground">
                        Manage API keys for external access to your CRM.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={(v) => {
                    if (!v) setGeneratedKey(null); // Reset on close
                    setOpen(v);
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Generate Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate API Key</DialogTitle>
                            <DialogDescription>
                                Create a new key for your application.
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedKey ? (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="label">Key Label</Label>
                                    <Input
                                        id="label"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        placeholder="e.g. Zapier Integration"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-md border border-yellow-500/20 flex items-start gap-2">
                                    <ShieldAlert className="h-5 w-5 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold">Save this key now!</p>
                                        <p>We won&apos;t show it again. If you lose it, you&apos;ll need to generate a new one.</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Input value={generatedKey} readOnly className="font-mono pr-10" />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-0 top-0 h-10 w-10 hover:bg-transparent"
                                        onClick={() => copyToClipboard(generatedKey)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!generatedKey ? (
                                <>
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={createKey} disabled={!newLabel}>Generate</Button>
                                </>
                            ) : (
                                <Button onClick={() => setOpen(false)}>Done</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-4">
                {keys.map((key) => (
                    <Card key={key.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{key.label}</span>
                                    {key.scopes.map(scope => (
                                        <Badge key={scope} variant="secondary" className="text-[10px]">{scope}</Badge>
                                    ))}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                    Prefix: {key.key_prefix}•••••
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs text-muted-foreground text-right">
                                    <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                                    <p>Last Used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteKey(key.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
                {!loading && keys.length === 0 && (
                    <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
                        <p>No active API keys.</p>
                    </div>
                )}
            </div>

            <Separator className="my-8" />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            CRM Integration Key
                        </CardTitle>
                        <CardDescription>
                            This key is used for the Legacy Lead API (/api/v1/Lead).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="crm_key">CRM API Key</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="crm_key" 
                                    value={crmApiKey} 
                                    onChange={(e) => setCrmApiKey(e.target.value)}
                                    placeholder="Enter your secret integration key"
                                    className="font-mono text-xs"
                                />
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => {
                                        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                                            .map(b => b.toString(16).padStart(2, '0'))
                                            .join('');
                                        setCrmApiKey(key);
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button 
                                    onClick={updateCrmKey}
                                    disabled={isUpdatingCrmKey}
                                >
                                    {isUpdatingCrmKey ? "..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-lg">API Integration Help</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-primary">PUSH LEADS (POST)</p>
                            <pre className="p-3 bg-black text-[10px] text-green-400 rounded overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST '${origin || ''}/api/v1/Lead' \\
-H "X-Api-Key: ${crmApiKey || 'YOUR_KEY'}" \\
-H "Content-Type: application/json" \\
-d '{"firstName":"Demo","emailAddress":"demo@example.com"}'`}
                            </pre>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-primary">PULL LEADS (GET)</p>
                            <pre className="p-3 bg-black text-[10px] text-blue-400 rounded overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X GET '${origin || ''}/api/v1/Lead?where[0][type]=after&where[0][field]=createdAt&where[0][value]=2024-03-25T00:00:00' \\
-H "X-Api-Key: ${crmApiKey || 'YOUR_KEY'}"`}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
