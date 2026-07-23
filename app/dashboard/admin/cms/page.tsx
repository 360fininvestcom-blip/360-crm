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
    CheckCircle2
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
    getBlogPosts,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    getDonationCampaigns,
    createDonationCampaign,
    updateDonationCampaign,
    deleteDonationCampaign
} from "@/actions/cms";

export default function AdminCmsPage() {
    const [activeTab, setActiveTab] = useState("blog");
    const [loading, setLoading] = useState(true);

    // Blog states
    const [posts, setPosts] = useState<any[]>([]);
    const [blogSearch, setBlogSearch] = useState("");
    const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [blogTitle, setBlogTitle] = useState("");
    const [blogSlug, setBlogSlug] = useState("");
    const [blogContent, setBlogContent] = useState("");
    const [blogCover, setBlogCover] = useState("");
    const [blogPublished, setBlogPublished] = useState(false);

    // Campaign states
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [campSearch, setCampSearch] = useState("");
    const [isCampDialogOpen, setIsCampDialogOpen] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState<any | null>(null);
    const [campTitle, setCampTitle] = useState("");
    const [campDesc, setCampDesc] = useState("");
    const [campGoal, setCampGoal] = useState("");
    const [campCurrent, setCampCurrent] = useState("");
    const [campActive, setCampActive] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedPosts, fetchedCamps] = await Promise.all([
                getBlogPosts(),
                getDonationCampaigns()
            ]);
            setPosts(fetchedPosts);
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

    // Blog handlers
    const handleOpenBlogDialog = (post: any | null = null) => {
        setSelectedPost(post);
        if (post) {
            setBlogTitle(post.title);
            setBlogSlug(post.slug);
            setBlogContent(post.content);
            setBlogCover(post.coverImageUrl || "");
            setBlogPublished(post.published);
        } else {
            setBlogTitle("");
            setBlogSlug("");
            setBlogContent("");
            setBlogCover("");
            setBlogPublished(false);
        }
        setIsBlogDialogOpen(true);
    };

    const handleSaveBlogPost = async () => {
        if (!blogTitle || !blogSlug || !blogContent) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            if (selectedPost) {
                await updateBlogPost(selectedPost.id, {
                    title: blogTitle,
                    slug: blogSlug,
                    content: blogContent,
                    coverImageUrl: blogCover || undefined,
                    published: blogPublished
                });
                toast.success("Blog post updated successfully");
            } else {
                await createBlogPost({
                    title: blogTitle,
                    slug: blogSlug,
                    content: blogContent,
                    coverImageUrl: blogCover || undefined,
                    published: blogPublished
                });
                toast.success("Blog post created successfully");
            }
            setIsBlogDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to save blog post");
        }
    };

    const handleDeleteBlogPost = async (id: string) => {
        if (!confirm("Are you sure you want to delete this blog post?")) return;
        try {
            await deleteBlogPost(id);
            toast.success("Blog post deleted");
            loadData();
        } catch {
            toast.error("Failed to delete blog post");
        }
    };

    // Campaign handlers
    const handleOpenCampDialog = (camp: any | null = null) => {
        setSelectedCamp(camp);
        if (camp) {
            setCampTitle(camp.title);
            setCampDesc(camp.description || "");
            setCampGoal(camp.goalAmount.toString());
            setCampCurrent(camp.currentAmount.toString());
            setCampActive(camp.isActive);
        } else {
            setCampTitle("");
            setCampDesc("");
            setCampGoal("");
            setCampCurrent("0");
            setCampActive(true);
        }
        setIsCampDialogOpen(true);
    };

    const handleSaveCampaign = async () => {
        if (!campTitle || !campGoal) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const goal = parseFloat(campGoal);
            const current = parseFloat(campCurrent || "0");
            if (isNaN(goal)) {
                toast.error("Goal amount must be a number");
                return;
            }

            if (selectedCamp) {
                await updateDonationCampaign(selectedCamp.id, {
                    title: campTitle,
                    description: campDesc || undefined,
                    goalAmount: goal,
                    currentAmount: current,
                    isActive: campActive
                });
                toast.success("Donation campaign updated");
            } else {
                await createDonationCampaign({
                    title: campTitle,
                    description: campDesc || undefined,
                    goalAmount: goal,
                    isActive: campActive
                });
                toast.success("Donation campaign created");
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
            await deleteDonationCampaign(id);
            toast.success("Campaign deleted");
            loadData();
        } catch {
            toast.error("Failed to delete campaign");
        }
    };

    const filteredPosts = posts.filter(p =>
        p.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(blogSearch.toLowerCase())
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
                <p className="text-muted-foreground mt-1">Manage public articles, campaigns, and donation goals.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="blog" className="rounded-lg">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Blog & News
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="rounded-lg">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Donation Goals
                    </TabsTrigger>
                </TabsList>

                {/* BLOG TABS */}
                <TabsContent value="blog" className="mt-6 space-y-4 outline-none">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search blog posts..."
                                className="pl-10"
                                value={blogSearch}
                                onChange={(e) => setBlogSearch(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => handleOpenBlogDialog(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Post
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map((post) => (
                            <Card key={post.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="aspect-video w-full bg-muted relative flex items-center justify-center text-muted-foreground">
                                    {post.coverImageUrl ? (
                                        <img src={post.coverImageUrl} alt={post.title} className="object-cover w-full h-full" />
                                    ) : (
                                        <BookOpen className="h-10 w-10 opacity-30" />
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <Badge variant={post.published ? "default" : "secondary"} className={post.published ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                                            {post.published ? "Published" : "Draft"}
                                        </Badge>
                                    </div>
                                </div>
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-lg line-clamp-1">{post.title}</CardTitle>
                                    <CardDescription className="font-mono text-xs truncate">/{post.slug}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between">
                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.content}</p>
                                    <div className="flex gap-2 justify-end border-t pt-3">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenBlogDialog(post)}>
                                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteBlogPost(post.id)}>
                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* CAMPAIGN TABS */}
                <TabsContent value="campaigns" className="mt-6 space-y-4 outline-none">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search campaigns..."
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
                            const goal = parseFloat(camp.goalAmount.toString()) || 1;
                            const current = parseFloat(camp.currentAmount.toString()) || 0;
                            const percent = Math.min(Math.round((current / goal) * 100), 100);

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
                                                <span>Raised: ${current.toLocaleString()}</span>
                                                <span className="text-muted-foreground">Goal: ${goal.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${percent}%` }} />
                                            </div>
                                            <div className="text-right text-xs font-medium text-muted-foreground">
                                                {percent}% of target reached
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

            {/* BLOG DIALOG */}
            <Dialog open={isBlogDialogOpen} onOpenChange={setIsBlogDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedPost ? "Edit Blog Post" : "Create Blog Post"}</DialogTitle>
                        <DialogDescription>Write or modify blog updates that appear on your landing page.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="Enter post title"
                                    value={blogTitle}
                                    onChange={(e) => {
                                        setBlogTitle(e.target.value);
                                        // Auto-generate slug
                                        if (!selectedPost) {
                                            setBlogSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug *</Label>
                                <Input
                                    id="slug"
                                    placeholder="post-url-slug"
                                    value={blogSlug}
                                    onChange={(e) => setBlogSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cover">Cover Image URL</Label>
                            <Input
                                id="cover"
                                placeholder="https://example.com/image.jpg"
                                value={blogCover}
                                onChange={(e) => setBlogCover(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                placeholder="Write post content here..."
                                rows={8}
                                value={blogContent}
                                onChange={(e) => setBlogContent(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="published" checked={blogPublished} onCheckedChange={setBlogPublished} />
                            <Label htmlFor="published">Publish immediately</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBlogDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveBlogPost}>Save Post</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CAMPAIGN DIALOG */}
            <Dialog open={isCampDialogOpen} onOpenChange={setIsCampDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedCamp ? "Edit Donation Campaign" : "Create Donation Campaign"}</DialogTitle>
                        <DialogDescription>Configure campaign settings, fundraising targets, and raise progression.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="ctitle">Campaign Title *</Label>
                            <Input
                                id="ctitle"
                                placeholder="e.g. Clean Water Campaign"
                                value={campTitle}
                                onChange={(e) => setCampTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cdesc">Description</Label>
                            <Textarea
                                id="cdesc"
                                placeholder="Describe the goal of this fundraiser..."
                                rows={3}
                                value={campDesc}
                                onChange={(e) => setCampDesc(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cgoal">Goal Target ($) *</Label>
                                <Input
                                    id="cgoal"
                                    type="number"
                                    placeholder="50000"
                                    value={campGoal}
                                    onChange={(e) => setCampGoal(e.target.value)}
                                />
                            </div>
                            {selectedCamp && (
                                <div className="space-y-2">
                                    <Label htmlFor="ccurrent">Current Raised ($)</Label>
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
