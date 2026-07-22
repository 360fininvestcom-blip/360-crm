"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendarEvents } from "@/hooks/use-data";
import { EventDialog } from "@/components/calendar/event-dialog";
import { format, isSameDay, parseISO } from "date-fns";

export default function CalendarPage() {
    const router = useRouter();
    const { data: events, isLoading } = useCalendarEvents();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    // Generate calendar days
    const today = new Date();
    const currentMonth = today.toLocaleString("default", { month: "long" });
    const currentYear = today.getFullYear();

    const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
    ).getDate();
    const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    ).getDay();

    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const getEventsForDay = (day: number) => {
        if (!events) return [];
        const date = new Date(currentYear, today.getMonth(), day);
        return events.filter(event => isSameDay(parseISO((event as any).startTime as string), date));
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your schedule and upcoming meetings
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard/settings?tab=integrations")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Sync Calendar
                    </Button>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Event
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-xl">
                                    {currentMonth} {currentYear}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Day</Button>
                                <Button variant="ghost" size="sm">Week</Button>
                                <Button variant="secondary" size="sm">Month</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden border">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <div
                                        key={day}
                                        className="bg-background p-4 text-center text-sm font-medium text-muted-foreground"
                                    >
                                        {day}
                                    </div>
                                ))}
                                {calendarDays.map((day, index) => {
                                    const dayEvents = day ? getEventsForDay(day) : [];
                                    const isToday = day === today.getDate();

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "bg-background min-h-[120px] p-2 transition-colors hover:bg-muted/50 relative group",
                                                !day && "bg-muted/50"
                                            )}
                                            onClick={() => {
                                                if (day) {
                                                    setSelectedDate(new Date(currentYear, today.getMonth(), day));
                                                    setIsDialogOpen(true);
                                                }
                                            }}
                                        >
                                            {day && (
                                                <>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span
                                                            className={cn(
                                                                "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                                                isToday
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {day}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 -mt-1 -mr-1"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {dayEvents.map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className="px-2 py-1 rounded text-xs truncate bg-primary/10 text-primary border border-primary/20"
                                                            >
                                                                {event.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Upcoming Events</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : events && events.length > 0 ? (
                                events.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <span className="text-xs font-medium uppercase">
                                                {format(parseISO((event as any).startTime || (event as any).startTime), "MMM")}
                                            </span>
                                            <span className="text-lg font-bold">
                                                {format(parseISO((event as any).startTime || (event as any).startTime), "d")}
                                            </span>
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <p className="text-sm font-medium leading-none truncate">
                                                {event.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(parseISO((event as any).startTime || (event as any).startTime), "h:mm a")} - {format(parseISO((event as any).endTime || (event as any).endTime), "h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No upcoming events
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
                        <CardContent className="p-6">
                            <h3 className="font-semibold mb-2">Sync Your Calendar</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Connect Google Calendar or Outlook to automatically sync your meetings.
                            </p>
                            <Button className="w-full" onClick={() => router.push("/dashboard/settings?tab=integrations")}>
                                Connect Calendar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <EventDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                selectedDate={selectedDate}
            />
        </div>
    );
}

// Helper for class names
function cn(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(" ");
}
