"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getTwilioConfig } from "@/app/actions/settings";
import { Switch } from "@/components/ui/switch";

export function TwilioSettings({ orgId }: { orgId: string }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [accountSid, setAccountSid] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [fromNumber, setFromNumber] = useState("");
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const data = await getTwilioConfig(orgId);

                if (data) {
                    setAccountSid(data.account_sid);
                    setAuthToken(""); // Never expose auth token to client
                    setFromNumber(data.from_number);
                    setIsActive(data.is_active);
                }
            } catch (err) {
                console.error("Failed to fetch Twilio config", err);
            } finally {
                setLoading(false);
            }
        };

        if (orgId) fetchConfig();
    }, [orgId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/settings/twilio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountSid,
                    authToken,
                    fromNumber,
                    isActive,
                    orgId
                })
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to save configuration");
            }
            
            toast.success("Twilio settings saved successfully");
            setAuthToken(""); // clear token after saving for security
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Twilio SMS Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Twilio SMS Integration
                </CardTitle>
                <CardDescription>
                    Configure your Twilio account for sending bulk SMS campaigns.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="accountSid">Account SID</Label>
                        <Input 
                            id="accountSid" 
                            value={accountSid} 
                            onChange={(e) => setAccountSid(e.target.value)} 
                            placeholder="AC..." 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="authToken">Auth Token (Leave empty to keep existing)</Label>
                        <Input 
                            id="authToken" 
                            type="password" 
                            value={authToken} 
                            onChange={(e) => setAuthToken(e.target.value)} 
                            placeholder="••••••••••••••••••••••••••••••••" 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fromNumber">From Phone Number (Must be a Twilio number)</Label>
                    <Input 
                        id="fromNumber" 
                        value={fromNumber} 
                        onChange={(e) => setFromNumber(e.target.value)} 
                        placeholder="+1234567890" 
                    />
                </div>
                <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="isActive" className="font-medium cursor-pointer">
                        Enable Twilio Integration
                    </Label>
                    <Switch 
                        id="isActive" 
                        checked={isActive} 
                        onCheckedChange={setIsActive} 
                    />
                </div>
                <Button onClick={handleSave} disabled={saving} className="mt-4">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Twilio Configuration
                </Button>
            </CardContent>
        </Card>
    );
}
