"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    BookOpen,
    DollarSign,
    Edit3,
    Trash2,
    Calendar,
    Globe,
    Check,
    Loader2,
    CheckCircle2,
    Megaphone,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getSalesCampaigns,
    createSalesCampaign,
    updateSalesCampaign,
    deleteSalesCampaign
} from "@/actions/cms";

export default function AdminCmsPage() {
    const [activeTab, setActiveTab] = useState("announcements");
    const [loading, setLoading] = useState(true);

    // Announcement states
    const [anns, setAnns] = useState<any[]>([]);
    const [annSearch, setAnnSearch] = useState("");
    const [isAnnDialogOpen, setIsAnnDialogOpen] = useState(false);
    const [selectedAnn, setSelectedAnn] = useState<any | null>(null);
    const [annTitle, setAnnTitle] = useState("");
    const [annSlug, setAnnSlug] = useState("");
    const [annContent, setAnnContent] = useState("");
    const [annCover, setAnnCover] = useState("");
    const [annPublished, setAnnPublished] = useState(false);

    // Sales Campaign states
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [campSearch, setCampSearch] = useState("");
    const [isCampDialogOpen, setIsCampDialogOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<any | null>(null);
    const [campTitle, setCampTitle] = useState("");
    const [campDesc, setCampDesc] = useState("");
    const [campTarget, setCampTarget] = useState("");
    const [campCurrent, setCampCurrent] = useState("");
    const [campActive, setCampActive] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedAnns, fetchedCamps] = await Promise.all([
                getAnnouncements(),
                getSalesCampaigns()
            ]);
            setAnns(fetchedAnns);
            setCampaigns(fetchedCamps);
        } catch (error) {
            toast.error("Failed to load CMS content");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Announcement handlers
    const handleOpenAnnDialog = (ann: any | null = null) => {
        setSelectedAnn(ann);
        if (ann) {
            setAnnTitle(ann.title);
            setAnnSlug(ann.slug);
            setAnnContent(ann.content);
            setAnnCover(ann.coverImageUrl || "");
            setAnnPublished(ann.published);
        } else {
            setAnnTitle("");
            setAnnSlug("");
            setAnnContent("");
            setAnnCover("");
            setAnnPublished(false);
        }
        setIsAnnDialogOpen(true);
    };

    const handleSaveAnnouncement = async () => {
        if (!annTitle || !annSlug || !annContent) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            if (selectedAnn) {
                await updateAnnouncement(selectedAnn.id, {
                    title: annTitle,
                    slug: annSlug,
                    content: annContent,
                    coverImageUrl: annCover || undefined,
                    published: annPublished
                });
                toast.success("Announcement updated successfully");
            } else {
                await createAnnouncement({
                    title: annTitle,
                    slug: annSlug,
                    content: annContent,
                    coverImageUrl: annCover || undefined,
                    published: annPublished
                });
                toast.success("Announcement created successfully");
            }
            setIsAnnDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to save announcement");
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteAnnouncement(id);
            toast.success("Announcement deleted");
            loadData();
        } catch {
            toast.error("Failed to delete announcement");
        }
    };

    // Campaign handlers
    const handleOpenCampDialog = (camp: any | null = null) => {
        setSelectedCamp(camp);
        if (camp) {
            setCampTitle(camp.title);
            setCampDesc(camp.description || "");
            setCampTarget(camp.targetRevenue.toString());
            setCampCurrent(camp.currentRevenue.toString());
            setCampActive(camp.isActive);
        } else {
            setCampTitle("");
            setCampDesc("");
            setCampTarget("");
            setCampCurrent("0");
            setCampActive(true);
        }
        setIsCampDialogOpen(true);
    };

    const handleSaveCampaign = async () => {
        if (!campTitle || !campTarget) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const target = parseFloat(campTarget);
            const current = parseFloat(campCurrent || "0");
            if (isNaN(target)) {
                toast.error("Target revenue must be a number");
                return;
            }

            if (selectedCamp) {
                await updateSalesCampaign(selectedCamp.id, {
                    title: campTitle,
                    description: campDesc || undefined,
                    targetRevenue: target,
                    currentRevenue: current,
                    isActive: campActive
                });
                toast.success("Sales campaign updated");
            } else {
                await createSalesCampaign({
                    title: campTitle,
                    description: campDesc || undefined,
                    targetRevenue: target,
                    isActive: campActive
                });
                toast.success("Sales campaign created");
            }
            setIsCampDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to save campaign");
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        try {
            await deleteSalesCampaign(id);
            toast.success("Campaign deleted");
            loadData();
        } catch {
            toast.error("Failed to delete campaign");
        }
    };

    const filteredAnns = anns.filter(a =>
        a.title.toLowerCase().includes(annSearch.toLowerCase()) ||
        a.slug.toLowerCase().includes(annSearch.toLowerCase())
    );

    const filteredCamps = campaigns.filter(c =>
        c.title.toLowerCase().includes(campSearch.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-70" />
                <p className="text-sm font-medium text-muted-foreground">Loading CMS panel...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Content Management (CMS)</h1>
                <p className="text-muted-foreground mt-1">Manage system announcements, help updates, and sales campaigns.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="announcements" className="rounded-lg">
                        <Megaphone className="h-4 w-4 mr-2" />
                        Announcements
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="rounded-lg">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Sales Campaigns
                    </TabsTrigger>
                </TabsList>

                {/* ANNOUNCEMENT TAB */}
                <TabsContent value="announcements" className="mt-6 space-y-4 outline-none">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search announcements..."
                                className="pl-10"
                                value={annSearch}
                                onChange={(e) => setAnnSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => handleOpenAnnDialog(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Announcement
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAnns.map((ann) => (
                            <Card key={ann.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="aspect-video w-full bg-muted relative flex items-center justify-center text-muted-foreground">
                                    {ann.coverImageUrl ? (
                                        <img src={ann.coverImageUrl} alt={ann.title} className="object-cover w-full h-full" />
                                    ) : (
                                        <Megaphone className="h-10 w-10 opacity-30" />
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={ann.published ? "default" : "secondary"} className={ann.published ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                                            {ann.published ? "Live" : "Draft"}
                                        </Badge>
                                    </div>
                                </div>
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-lg line-clamp-1">{ann.title}</CardTitle>
                                    <CardDescription className="font-mono text-xs truncate">/announcements/{ann.slug}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{ann.content}</p>
                                    <div className="flex gap-2 justify-end border-t pt-3">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenAnnDialog(ann)}>
                                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteAnnouncement(ann.id)}>
                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* SALES CAMPAIGNS TAB */}
                <TabsContent value="campaigns" className="mt-6 space-y-4 outline-none">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search sales campaigns..."
                                className="pl-10"
                                value={campSearch}
                                onChange={(e) => setCampSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => handleOpenCampDialog(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Campaign
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredCamps.map((camp) => {
                            const target = parseFloat(camp.targetRevenue.toString()) || 1;
                            const current = parseFloat(camp.currentRevenue.toString()) || 0;
                            const percent = Math.min(Math.round((current / target) * 100), 100);

                            return (
                                <Card key={camp.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <CardHeader className="p-5 pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-xl font-bold">{camp.title}</CardTitle>
                                            <Badge variant={camp.isActive ? "default" : "secondary"} className={camp.isActive ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}>
                                                {camp.isActive ? "Active" : "Closed"}
                                            </Badge>
                                        </div>
                                        <CardDescription>{camp.description || "No description provided."}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 pt-0 space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-semibold">
                                                <span>Revenue: ${current.toLocaleString()}</span>
                                                <span className="text-muted-foreground">Target: ${target.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                                            </div>
                                            <div className="text-right text-xs font-medium text-muted-foreground">
                                                {percent}% of target revenue reached
                                            </div>
                                        </div>

                                        <div className="flex gap-2 justify-end border-t pt-3">
                                            <Button size="sm" variant="outline" onClick={() => handleOpenCampDialog(camp)}>
                                                <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteCampaign(camp.id)}>
                                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ANNOUNCEMENT DIALOG */}
            <Dialog open={isAnnDialogOpen} onOpenChange={setIsAnnDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedAnn ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
                        <DialogDescription>Write system announcements or news updates visible to external users.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="Enter title"
                                    value={annTitle}
                                    onChange={(e) => {
                                        setAnnTitle(e.target.value);
                                        if (!selectedAnn) {
                                            setAnnSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug *</Label>
                                <Input
                                    id="slug"
                                    placeholder="announcement-url-slug"
                                    value={annSlug}
                                    onChange={(e) => setAnnSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cover">Cover Image URL</Label>
                            <Input
                                id="cover"
                                placeholder="https://example.com/image.jpg"
                                value={annCover}
                                onChange={(e) => setAnnCover(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                placeholder="Write content here..."
                                rows={8}
                                value={annContent}
                                onChange={(e) => setAnnContent(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="published" checked={annPublished} onCheckedChange={setAnnPublished} />
                            <Label htmlFor="published">Publish immediately</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAnnDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAnnouncement}>Save Announcement</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CAMPAIGN DIALOG */}
            <Dialog open={isCampDialogOpen} onOpenChange={setIsCampDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedCamp ? "Edit Sales Campaign" : "Create SalesCampaign"}</DialogTitle>
                        <DialogDescription>Configure B2B sales/revenue targets and active campaign details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="ctitle">Campaign Title *</Label>
                            <Input
                                id="ctitle"
                                placeholder="e.g. Q3 Sales Booster"
                                value={campTitle}
                                onChange={(e) => setCampTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cdesc">Description</Label>
                            <Textarea
                                id="cdesc"
                                placeholder="Describe target audience or details..."
                                rows={3}
                                value={campDesc}
                                onChange={(e) => setCampDesc(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ctarget">Target Revenue ($) *</Label>
                                <Input
                                    id="ctarget"
                                    type="number"
                                    placeholder="50000"
                                    value={campTarget}
                                    onChange={(e) => setCampTarget(e.target.value)}
                                />
                            </div>
                            {selectedCamp && (
                                <div className="space-y-2">
                                    <Label htmlFor="ccurrent">Current Revenue ($)</Label>
                                    <Input
                                        id="ccurrent"
                                        type="number"
                                        placeholder="12500"
                                        value={campCurrent}
                                        onChange={(e) => setCampCurrent(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="cactive" checked={campActive} onCheckedChange={setCampActive} />
                            <Label htmlFor="cactive">Campaign Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCampDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCampaign}>Save Campaign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
