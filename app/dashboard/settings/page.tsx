"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    User,
    Building2,
    Palette,
    Shield,
    Bell,
    Key,
    Code,
    Globe,
    Calendar,
    Phone,
    Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useActiveProfile, useUpdateProfile, useOrganization, useUpdateOrganization, useApiKeys, useUpdateApiKeys, useIntegrations, useSyncCalendar, useUpdatePassword, useDeleteUserAccountFinal } from "@/hooks/use-settings";
import { EmailAccountManager } from "@/components/settings/email-account-manager";
import { SipAccountManager } from "@/components/settings/sip-account-manager";
import { TwilioSettings } from "@/components/dashboard/twilio-settings";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useRef, useState, Suspense } from "react";
import type { Profile, Organization, APIKeys, AIProvider } from "@/types";

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { data: profile, isLoading: profileLoading } = useActiveProfile();
    const { data: org } = useOrganization(profile?.organization_id || null);
    const { data: apiKeys } = useApiKeys(profile?.organization_id || null);
    const { trigger: updateProfile, isMutating: isUpdatingProfile } = useUpdateProfile();
    const { trigger: updateOrg, isMutating: isUpdatingOrg } = useUpdateOrganization();
    const { trigger: updateApiKeys, isMutating: isUpdatingApiKeys } = useUpdateApiKeys();
    const { data: integrations } = useIntegrations(profile?.id || null);
    const { trigger: syncCalendar, isMutating: isSyncing } = useSyncCalendar();
    const { trigger: updatePassword, isMutating: isUpdatingPassword } = useUpdatePassword();
    const { trigger: deleteAccount, isMutating: isDeletingAccount } = useDeleteUserAccountFinal();

    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") || "profile";
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const isAdmin = profile?.role === "admin" || profile?.role === "manager";

    // Profile Form
    const profileForm = useForm({
        defaultValues: {
            full_name: profile?.full_name || "",
            phone: profile?.phone || "",
        }
    });

    // Organization Form
    const orgForm = useForm({
        defaultValues: {
            name: org?.name || "",
            slug: org?.slug || "",
            primary_color: org?.primary_color || "#3b82f6",
            logo_url: org?.logo_url || "",
        }
    });




    // API Keys Form
    const apiKeysForm = useForm({
        defaultValues: {
            openai_key: "",
            gemini_key: "",
            qwen_key: "",
            kimi_key: "",
            crm_api_key: apiKeys?.crm_api_key || "",
            active_provider: (apiKeys?.active_provider || "openai") as AIProvider,
        }
    });

    // Notifications Form
    const notificationForm = useForm({
        defaultValues: {
            email: profile?.notification_preferences?.email ?? true,
            leads: profile?.notification_preferences?.leads ?? true,
            tasks: profile?.notification_preferences?.tasks ?? true,
            deals: profile?.notification_preferences?.deals ?? true,
            missed_calls: profile?.notification_preferences?.missed_calls ?? false,
        }
    });

    // Password Form
    const passwordForm = useForm({
        defaultValues: {
            new_password: "",
            confirm_password: "",
        }
    });

    const colorPreviewRef = useRef<HTMLDivElement>(null);
    const watchedPrimaryColor = useWatch({
        control: orgForm.control,
        name: "primary_color",
    });

    useEffect(() => {
        if (colorPreviewRef.current) {
            colorPreviewRef.current.style.backgroundColor = watchedPrimaryColor || "#3b82f6";
        }
    }, [watchedPrimaryColor]);

    // Refs to track previous data state to prevent infinite loops
    // Refs to track if forms have been initialized with data
    const profileInitialized = useRef(false);
    const orgInitialized = useRef(false);
    const apiKeysInitialized = useRef(false);
    const notificationsInitialized = useRef(false);

    // Init forms when data first loads
    useEffect(() => {
        if (profile && !profileInitialized.current) {
            profileForm.reset({ full_name: profile.full_name, phone: profile.phone });
            profileInitialized.current = true;
        }
    }, [profile, profileForm]);

    useEffect(() => {
        if (org && !orgInitialized.current) {
            orgForm.reset({ name: org.name, slug: org.slug, primary_color: org.primary_color, logo_url: org.logo_url });
            orgInitialized.current = true;
        }
    }, [org, orgForm]);

    useEffect(() => {
        if (apiKeys && !apiKeysInitialized.current) {
            apiKeysForm.reset({
                active_provider: apiKeys.active_provider || "openai",
                crm_api_key: apiKeys.crm_api_key || "",
                openai_key: "",
                gemini_key: "",
                qwen_key: "",
                kimi_key: "",
            });
            apiKeysInitialized.current = true;
        }
    }, [apiKeys, apiKeysForm]);

    useEffect(() => {
        if (profile?.notification_preferences && !notificationsInitialized.current) {
            notificationForm.reset({
                email: profile.notification_preferences.email ?? true,
                leads: profile.notification_preferences.leads ?? true,
                tasks: profile.notification_preferences.tasks ?? true,
                deals: profile.notification_preferences.deals ?? true,
                missed_calls: profile.notification_preferences.missed_calls ?? false,
            });
            notificationsInitialized.current = true;
        }
    }, [profile, notificationForm]);


    // We do NOT block rendering on loading, because it unmounts the component and resets refs.
    if (profileLoading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                <p className="text-muted-foreground">Profile not found. Please log in again.</p>
                <Button onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
        );
    }

    const onProfileSubmit = async (data: Partial<Profile>) => {
        try {
            await updateProfile({ id: profile.id, updates: data });
            toast.success("Profile updated successfully");
        } catch {
            toast.error("Failed to update profile");
        }
    };

    const onOrgSubmit = async (data: Partial<Organization>) => {
        try {
            await updateOrg({ id: org?.id || "", updates: data });
            toast.success("Organization updated successfully");
        } catch {
            toast.error("Failed to update organization");
        }
    };

    const onNotificationSubmit = async (data: Record<string, boolean>) => {
        try {
            await updateProfile({ 
                id: profile.id, 
                updates: { notification_preferences: data } 
            });
            toast.success("Notification preferences saved");
        } catch {
            toast.error("Failed to save preferences");
        }
    };



    const onApiKeysSubmit = async (data: { openai_key: string; gemini_key: string; qwen_key: string; kimi_key: string; crm_api_key: string; active_provider: AIProvider }) => {
        try {
            const updates: Partial<APIKeys> = {
                active_provider: data.active_provider,
                crm_api_key: data.crm_api_key
            };
            // Only include keys that were entered (non-empty)
            if (data.openai_key) updates.openai_key_encrypted = data.openai_key;
            if (data.gemini_key) updates.gemini_key_encrypted = data.gemini_key;
            if (data.qwen_key) updates.qwen_key_encrypted = data.qwen_key;
            if (data.kimi_key) updates.kimi_key_encrypted = data.kimi_key;

            await updateApiKeys({ orgId: profile.organization_id, updates });
            toast.success("API keys saved successfully");
            apiKeysForm.reset({ 
                openai_key: "", 
                gemini_key: "", 
                qwen_key: "", 
                kimi_key: "", 
                crm_api_key: data.crm_api_key,
                active_provider: data.active_provider 
            });
        } catch {
            toast.error("Failed to save API keys");
        }
    };

    const onPasswordSubmit = async (data: Record<string, string>) => {
        if (data.new_password !== data.confirm_password) {
            toast.error("Passwords do not match");
            return;
        }
        if (data.new_password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        try {
            await updatePassword(data.new_password);
            toast.success("Password updated successfully");
            passwordForm.reset();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update password";
            toast.error(message);
        }
    };

    const onDeleteAccount = async () => {
        if (!window.confirm("Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.")) {
            return;
        }

        try {
            await deleteAccount();
            toast.success("Account deleted successfully. Redirecting...");
            // Force logout and redirect
            await authClient.signOut();
            window.location.href = "/login";
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete account";
            toast.error(message);
        }
    };


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your organization and account preferences.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="communications">Communications</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations & AI</TabsTrigger>
                    <TabsTrigger value="security">Security & Notifications</TabsTrigger>
                </TabsList>

                {/* General Settings: Profile + Organization */}
                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Settings
                            </CardTitle>
                            <CardDescription>
                                Manage your personal information and preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input id="full_name" {...profileForm.register("full_name")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={profile.email} disabled />
                                        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" type="tel" {...profileForm.register("phone")} />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isUpdatingProfile}>
                                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Profile
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {isAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Organization Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure your organization&apos;s branding and data architecture
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Organization Name</Label>
                                            <Input id="name" {...orgForm.register("name")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="slug">Subdomain</Label>
                                            <div className="flex">
                                                <Input id="slug" {...orgForm.register("slug")} className="rounded-r-none" />
                                                <span className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                                                    .nanosol.app
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                                            <Palette className="h-4 w-4 text-primary" />
                                            Branding & Identity
                                        </h4>
                                        <div className="grid gap-6 sm:grid-cols-2">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="primary_color">Primary Brand Color</Label>
                                                    <div className="flex gap-3">
                                                        <Input id="primary_color" {...orgForm.register("primary_color")} className="font-mono" />
                                                        <div
                                                            ref={colorPreviewRef}
                                                            className="w-10 h-10 rounded-xl border-2 border-background shadow-inner shrink-0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="logo_url">Logo Image URL</Label>
                                                    <Input id="logo_url" {...orgForm.register("logo_url")} placeholder="https://..." />
                                                </div>
                                            </div>

                                            <div className="bg-muted/30 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                                                {orgForm.watch("logo_url") ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img 
                                                        src={orgForm.watch("logo_url")} 
                                                        alt="Logo Preview" 
                                                        className="h-16 w-auto object-contain mb-4 rounded-lg"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                                        <Building2 className="h-8 w-8 text-primary" />
                                                    </div>
                                                )}
                                                <p className="text-sm font-medium">Visual Identity Preview</p>
                                                <p className="text-xs text-muted-foreground mt-1">Updates in real-time as you change branding settings.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={isUpdatingOrg} className="w-full sm:w-auto">
                                        {isUpdatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Organization
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Team Management
                            </CardTitle>
                            <CardDescription>
                                Manage your staff access, roles, and collaboration settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 text-center flex flex-col items-center">
                                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold">Manage Your Workspace</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto mt-2 mb-6">
                                    You can invite agents, managers, and admins to your organization from the dedicated team management module.
                                </p>
                                <Button asChild size="lg" className="rounded-xl px-10 shadow-lg shadow-primary/20">
                                    <Link href="/dashboard/team">
                                        Go to Team Management
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Communications - SIP & SMTP */}
                <TabsContent value="communications" className="space-y-6">
                    {profile && (
                        <SipAccountManager userId={profile.id} orgId={profile.organization_id} />
                    )}
                    {isAdmin && (
                        <EmailAccountManager orgId={profile.organization_id} />
                    )}
                </TabsContent>
                {/* Integrations & AI */}
                <TabsContent value="integrations">
                    <div className="space-y-6">
                        {/* Integration Status Overview */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="bg-muted/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">SIP Connection</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-lg font-bold">Active</span>
                                            </div>
                                        </div>
                                        <Phone className="h-8 w-8 text-primary/20" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">SMTP Service</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-lg font-bold">Configured</span>
                                            </div>
                                        </div>
                                        <Mail className="h-8 w-8 text-primary/20" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/30">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">AI Provider</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                <span className="text-lg font-bold">{apiKeys?.active_provider ? apiKeys.active_provider.toUpperCase() : 'NONE'}</span>
                                            </div>
                                        </div>
                                        <Key className="h-8 w-8 text-primary/20" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Developer - Admin Only */}
                        {isAdmin && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Code className="h-5 w-5" />
                                        Developer Settings
                                    </CardTitle>
                                    <CardDescription>
                                        Manage API keys for external integrations and custom apps.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href="/dashboard/settings/developer">
                                            Manage Public API Keys
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Web Forms Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    Web Forms
                                </CardTitle>
                                <CardDescription>
                                    Create and manage web-to-lead forms for your website
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/dashboard/settings/forms">
                                        Manage Lead Capture Forms
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Calendar Sync Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Calendar Sync
                                </CardTitle>
                                <CardDescription>
                                    Connect your external calendars to sync meetings and events
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-6">
                                    {/* Google Calendar */}
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-500/10 rounded-full">
                                                <Globe className="h-6 w-6 text-blue-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm">Google Calendar</h4>
                                                <p className="text-xs text-muted-foreground">Sync events, meetings and busy times</p>
                                                {integrations?.find(i => i.provider === 'google') && (
                                                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Connected
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {integrations?.find(i => i.provider === 'google') ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={isSyncing}
                                                    onClick={async () => {
                                                        try {
                                                            await syncCalendar({ provider: 'google' });
                                                            toast.success("Calendar synced successfully!");
                                                        } catch (err) {
                                                            toast.error(err instanceof Error ? err.message : "Sync failed");
                                                        }
                                                    }}
                                                >
                                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                                    Sync Now
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href="/api/integrations/google/auth">Connect</a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Outlook Calendar */}
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-orange-500/10 rounded-full">
                                                <Globe className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-sm">Outlook / Microsoft 365</h4>
                                                <p className="text-xs text-muted-foreground">Sync your Outlook calendar events</p>
                                                {integrations?.find(i => i.provider === 'outlook') && (
                                                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Connected
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {integrations?.find(i => i.provider === 'outlook') ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={isSyncing}
                                                    onClick={async () => {
                                                        try {
                                                            await syncCalendar({ provider: 'outlook' });
                                                            toast.success("Calendar synced successfully!");
                                                        } catch (err) {
                                                            toast.error(err instanceof Error ? err.message : "Sync failed");
                                                        }
                                                    }}
                                                >
                                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                                    Sync Now
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href="/api/integrations/outlook/auth">Connect</a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SIP Multi-Account Manager */}
                        {profile && (
                            <SipAccountManager userId={profile.id} orgId={profile.organization_id} />
                        )}

                        {isAdmin && (
                            <>
                                <EmailAccountManager orgId={profile.organization_id} />
                                <TwilioSettings orgId={profile.organization_id} />

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Key className="h-5 w-5" />
                                            AI Configuration
                                        </CardTitle>
                                        <CardDescription>
                                            Manage your API keys for AI-powered features. Keys are securely stored.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <form onSubmit={apiKeysForm.handleSubmit(onApiKeysSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="active_provider">Active AI Provider</Label>
                                                <select
                                                    id="active_provider"
                                                    {...apiKeysForm.register("active_provider")}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="openai">OpenAI (GPT-4)</option>
                                                    <option value="gemini">Google Gemini</option>
                                                    <option value="qwen">Alibaba QWEN</option>
                                                    <option value="kimi">Moonshot KIMI</option>
                                                </select>
                                            </div>
                                            <Separator />
                                            
                                            <div className="space-y-2 pb-4">
                                                <Label htmlFor="crm_api_key">CRM API Key (Legacy/External)</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        id="crm_api_key" 
                                                        {...apiKeysForm.register("crm_api_key")} 
                                                        placeholder="Enter a secret key for external integrations" 
                                                        className="font-mono"
                                                    />
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="icon"
                                                        onClick={() => {
                                                            const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                                                                .map(b => b.toString(16).padStart(2, '0'))
                                                                .join('');
                                                            apiKeysForm.setValue("crm_api_key", key);
                                                        }}
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Use this key in the <code>X-Api-Key</code> header to push/pull leads externally.
                                                </p>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="openai_key">OpenAI API Key</Label>
                                                    <Input id="openai_key" type="password" {...apiKeysForm.register("openai_key")} placeholder="sk-..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="gemini_key">Gemini API Key</Label>
                                                    <Input id="gemini_key" type="password" {...apiKeysForm.register("gemini_key")} placeholder="AIza..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="qwen_key">QWEN API Key</Label>
                                                    <Input id="qwen_key" type="password" {...apiKeysForm.register("qwen_key")} placeholder="qwen-..." />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="kimi_key">KIMI API Key</Label>
                                                    <Input id="kimi_key" type="password" {...apiKeysForm.register("kimi_key")} placeholder="kimi-..." />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Only enter AI keys you wish to update. Leave empty to keep existing.
                                            </p>
                                            <Button type="submit" disabled={isUpdatingApiKeys}>
                                                {isUpdatingApiKeys && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Save All Keys
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                <Card className="border-primary/20 bg-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Globe className="h-5 w-5 text-primary" />
                                            API Integration Examples
                                        </CardTitle>
                                        <CardDescription>
                                            How to push and pull leads using your CRM API Key.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold">Push Leads (POST)</h4>
                                            <pre className="p-4 rounded-xl bg-black/90 text-green-400 text-xs overflow-x-auto border border-white/10">
{`curl -X POST \\
  '${window.location.origin}/api/v1/Lead' \\
  -H 'Accept: application/json' \\
  -H 'X-Api-Key: ${apiKeysForm.watch("crm_api_key") || 'YOUR_KEY'}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "john.doe@example.com",
    "phoneNumber": "+1234567890"
  }'`}
                                            </pre>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold">Pull Leads (GET)</h4>
                                            <pre className="p-4 rounded-xl bg-black/90 text-blue-400 text-xs overflow-x-auto border border-white/10">
{`curl -X GET \\
  '${window.location.origin}/api/v1/Lead?where[0][type]=after&where[0][field]=createdAt&where[0][value]=2024-03-25T00:00:00' \\
  -H 'Accept: application/json' \\
  -H 'X-Api-Key: ${apiKeysForm.watch("crm_api_key") || 'YOUR_KEY'}'`}
                                            </pre>
                                        </div>
                                    </CardContent>
                                </Card>

                            </>
                        )}
                    </div>
                </TabsContent>

                {/* Security & Notifications */}
                <TabsContent value="security">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" />
                                    Notifications
                                </CardTitle>
                                <CardDescription>
                                    Manage your alert preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notify_email">Email Notifications</Label>
                                        <Switch 
                                            id="notify_email"
                                            checked={!!notificationForm.watch("email")}
                                            onCheckedChange={(checked: boolean) => notificationForm.setValue("email", checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notify_leads">New Lead Alerts</Label>
                                        <Switch 
                                            id="notify_leads"
                                            checked={!!notificationForm.watch("leads")}
                                            onCheckedChange={(checked: boolean) => notificationForm.setValue("leads", checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notify_tasks">Task Reminders</Label>
                                        <Switch 
                                            id="notify_tasks"
                                            checked={!!notificationForm.watch("tasks")}
                                            onCheckedChange={(checked: boolean) => notificationForm.setValue("tasks", checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notify_deals">Deal Updates</Label>
                                        <Switch 
                                            id="notify_deals"
                                            checked={!!notificationForm.watch("deals")}
                                            onCheckedChange={(checked: boolean) => notificationForm.setValue("deals", checked)}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full mt-4" variant="outline" disabled={isUpdatingProfile}>
                                        {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Preferences
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Account Security
                                </CardTitle>
                                <CardDescription>
                                    Update password and manage security
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new_password">New Password</Label>
                                        <Input 
                                            id="new_password" 
                                            type="password" 
                                            {...passwordForm.register("new_password", { required: true, minLength: 6 })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm_password">Confirm New Password</Label>
                                        <Input 
                                            id="confirm_password" 
                                            type="password" 
                                            {...passwordForm.register("confirm_password", { required: true })} 
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" variant="outline" disabled={isUpdatingPassword}>
                                        {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Password
                                    </Button>
                                </form>
                                <Separator />
                                <div className="flex items-center justify-between text-destructive">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">Delete Account</p>
                                        <p className="text-xs opacity-70">Permanently remove all data</p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={onDeleteAccount}
                                        disabled={isDeletingAccount}
                                    >
                                        {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
