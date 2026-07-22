"use client";

import { motion } from "framer-motion";
import { Plus, Search, MoreHorizontal, Shield, UserX, Mail, User } from "lucide-react";
import { useProfiles, useUpdateProfile, useDeleteProfile, useActiveProfile } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { AddMemberDialog } from "@/components/team/add-member-dialog";

const roleColors = {
    admin: "bg-red-500/10 text-red-500",
    manager: "bg-blue-500/10 text-blue-500",
    agent: "bg-green-500/10 text-green-500",
    viewer: "bg-gray-500/10 text-gray-500",
};

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TeamPage() {
    const { data: profiles, isLoading, mutate: refreshProfiles } = useProfiles();
    const { data: activeProfile, isLoading: activeLoading } = useActiveProfile();
    const router = useRouter();

    useEffect(() => {
        if (!activeLoading && activeProfile && activeProfile.role !== "admin" && activeProfile.role !== "manager") {
            router.push("/dashboard");
        }
    }, [activeProfile, activeLoading, router]);

    const { trigger: updateProfile } = useUpdateProfile();
    const { trigger: deleteProfile } = useDeleteProfile();

    const [searchQuery, setSearchQuery] = useState("");
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isAddManualDialogOpen, setIsAddManualDialogOpen] = useState(false);

    if (isLoading || activeLoading) {
        return <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-64 w-full" />
        </div>;
    }

    if (activeProfile && activeProfile.role !== "admin" && activeProfile.role !== "manager") {
        return null;
    }

    const filteredProfiles = profiles?.filter(p =>
        p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRoleChange = async (profileId: string, newRole: "admin" | "manager" | "agent" | "viewer") => {
        try {
            await updateProfile({ id: profileId, updates: { role: newRole } });
            toast.success("Role updated successfully");
            refreshProfiles();
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleDelete = async (profileId: string) => {
        if (!confirm("Are you sure you want to delete this profile? This won't delete the auth user.")) return;
        try {
            await deleteProfile(profileId);
            toast.success("Profile deleted");
            refreshProfiles();
        } catch {
            toast.error("Failed to delete profile");
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (isLoading) {
        return <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-64 w-full" />
        </div>;
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-muted-foreground mt-1">Manage staff roles and access levels.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setIsAddManualDialogOpen(true)}>
                        <User className="h-4 w-4 mr-2" />
                        Add Manually
                    </Button>
                    <Button onClick={() => setIsInviteDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite Member
                    </Button>
                </div>
            </div>

            <InviteMemberDialog
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onSuccess={refreshProfiles}
            />

            <AddMemberDialog
                open={isAddManualDialogOpen}
                onOpenChange={setIsAddManualDialogOpen}
                onSuccess={refreshProfiles}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-border">
                        {filteredProfiles?.map((profile) => (
                            <motion.div
                                key={profile.id}
                                variants={item}
                                className="flex items-center justify-between py-4"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={profile.avatarUrl || undefined} />
                                        <AvatarFallback>
                                            <User className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{profile.fullName || "New User"}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            {profile.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge variant="secondary" className={roleColors[profile.role]}>
                                        {profile.role.toUpperCase()}
                                    </Badge>

                                    {activeProfile?.role === "admin" && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleRoleChange(profile.id, "admin")}>
                                                    <Shield className="h-4 w-4 mr-2 text-red-500" />
                                                    Set as Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(profile.id, "manager")}>
                                                    <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                                    Set as Manager
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(profile.id, "agent")}>
                                                    <Shield className="h-4 w-4 mr-2 text-green-500" />
                                                    Set as Agent
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(profile.id)}
                                                    disabled={profile.id === activeProfile?.id}
                                                >
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Remove Member
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
