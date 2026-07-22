"use client";

import { motion } from "framer-motion";
import {
    Users,
    Briefcase,
    Phone,
    Mail,
    Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { DealDialog } from "@/components/deals/deal-dialog";
import { EmailComposerDialog } from "@/components/email/email-composer-dialog";
import { EventDialog } from "@/components/calendar/event-dialog";
import { useDialerStore } from "@/lib/stores";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

import { useActiveProfile, useContacts, useDeals, useActivities, useTasks, usePipelines } from "@/hooks/use-data";
import { StatsGrid } from "@/components/dashboard/overview/stats-grid";
import { ActivityTimeline } from "@/components/dashboard/overview/activity-timeline";
import { UpcomingTasks } from "@/components/dashboard/overview/upcoming-tasks";

export default function DashboardContent() {
    const { data: profile } = useActiveProfile();
    const { mutate: mutateContacts } = useContacts();
    const { mutate: mutateDeals } = useDeals();
    const { mutate: mutateActivities } = useActivities();
    const { mutate: mutateTasks } = useTasks("pending");
    const { data: pipelines } = usePipelines();

    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [dealDialogOpen, setDealDialogOpen] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [eventDialogOpen, setEventDialogOpen] = useState(false);
    const { openDialer } = useDialerStore();

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="space-y-6"
        >
            {/* Welcome Section */}
            <motion.div variants={item}>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {profile?.fullName || "User"}
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening with your CRM today.
                </p>
            </motion.div>

            {/* Stats Grid - Independent Loading */}
            <StatsGrid />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Recent Activity - Independent Loading */}
                <motion.div variants={item} className="lg:col-span-4">
                    <ActivityTimeline />
                </motion.div>

                {/* Upcoming Tasks - Independent Loading */}
                <motion.div variants={item} className="lg:col-span-3">
                    <UpcomingTasks />
                </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div variants={item}>
                <Card className="glass-panel card-hover-effect border-primary/10">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold tracking-tight">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        <Button className="btn-hover-effect shadow-md" onClick={() => setContactDialogOpen(true)}>
                            <Users className="h-4 w-4 mr-2" />
                            Add Contact
                        </Button>
                        <Button variant="outline" className="btn-hover-effect bg-background/50 backdrop-blur-sm hover:bg-accent" onClick={() => setDealDialogOpen(true)}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            Create Deal
                        </Button>
                        <Button variant="outline" className="btn-hover-effect bg-background/50 backdrop-blur-sm hover:bg-accent" onClick={() => openDialer()}>
                            <Phone className="h-4 w-4 mr-2" />
                            Make Call
                        </Button>
                        <Button variant="outline" className="btn-hover-effect bg-background/50 backdrop-blur-sm hover:bg-accent" onClick={() => setEmailDialogOpen(true)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                        </Button>
                        <Button variant="outline" className="btn-hover-effect bg-background/50 backdrop-blur-sm hover:bg-accent" onClick={() => setEventDialogOpen(true)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Meeting
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Dialogs */}
            <ContactDialog
                open={contactDialogOpen}
                onOpenChange={setContactDialogOpen}
                organizationId={profile?.organizationId || ""}
                onSuccess={() => {
                    mutateContacts();
                    mutateActivities();
                }}
            />
            <DealDialog
                open={dealDialogOpen}
                onOpenChange={setDealDialogOpen}
                organizationId={profile?.organizationId || ""}
                pipelineId={pipelines?.[0]?.id || "default"}
                // @ts-ignore
                stages={pipelines?.[0]?.stages || []}
                onSuccess={() => {
                    mutateDeals();
                    mutateActivities();
                }}
            />
            <EmailComposerDialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
                organizationId={profile?.organizationId || ""}
            />
            <EventDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                onSuccess={() => {
                    mutateTasks();
                    mutateActivities();
                }}
            />
        </motion.div>
    );
}
