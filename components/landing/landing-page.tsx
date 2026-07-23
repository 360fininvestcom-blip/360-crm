"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Users,
  Zap,
  Phone,
  Mail,
  BarChart3,
  Shield,
  CheckCircle2,
  Calendar,
  DollarSign,
  Heart,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LandingNav } from "@/components/landing/nav";
import { ClientMotionSSR as ClientMotion } from "@/components/landing/client-motion-ssr";
import { MouseGlowSSR as MouseGlow } from "@/components/landing/mouse-glow-ssr";
import { toast } from "sonner";

interface LandingPageProps {
  initialPosts?: any[];
  initialCampaigns?: any[];
}

const features = [
  {
    icon: Users,
    title: "Contact Management",
    description:
      "Organize and segment your contacts with custom fields, tags, and AI-powered lead scoring.",
  },
  {
    icon: BarChart3,
    title: "Visual Pipeline",
    description:
      "Track deals through customizable Kanban boards with forecasting and probability insights.",
  },
  {
    icon: Phone,
    title: "Built-in Calling",
    description:
      "Make and receive calls directly from your browser with WebRTC and SIP integration.",
  },
  {
    icon: Mail,
    title: "Email Sequences",
    description:
      "Automate follow-ups with drip campaigns, templates, and A/B testing capabilities.",
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description:
      "Build powerful automations with our visual no-code builder. Trigger actions on any event.",
  },
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description:
      "Smart summaries, predictive scoring, and an AI copilot to help you close more deals.",
  },
];

const testimonials = [
  {
    quote:
      "NanoSol CRM transformed how we manage our sales pipeline. The AI features alone save us hours every week.",
    author: "Sarah Chen",
    role: "VP of Sales, TechCorp",
  },
  {
    quote:
      "The built-in calling and email sequences are game-changers. We've increased our response rate by 40%.",
    author: "Michael Torres",
    role: "Sales Director, GrowthCo",
  },
];

const defaultCampaigns = [
  {
    id: "default-1",
    title: "Clean Water Initiative",
    description: "Building pipelines and solar-powered wells to bring clean, drinkable water to underserved regions.",
    goalAmount: 25000,
    currentAmount: 18450
  },
  {
    id: "default-2",
    title: "Education For All",
    description: "Funding classrooms, books, and scholarship programs for low-income children.",
    goalAmount: 15000,
    currentAmount: 6200
  }
];

const defaultPosts = [
  {
    id: "default-post-1",
    title: "Announcing Our 2026 Impact Report",
    slug: "announcing-our-2026-impact-report",
    content: "We are thrilled to share our annual impact report! Through our campaigns, we have provided clean water and education to over 10,000 children this year.",
    createdAt: "2026-06-15T00:00:00Z"
  },
  {
    id: "default-post-2",
    title: "Volunteers Build New Schoolhouse",
    slug: "volunteers-build-new-schoolhouse",
    content: "A group of 30 dedicated volunteers completed our new school building project, creating a safe learning environment for the community.",
    createdAt: "2026-07-01T00:00:00Z"
  }
];

export default function LandingPageContent({
  initialPosts = [],
  initialCampaigns = []
}: LandingPageProps) {
  const posts = initialPosts.length > 0 ? initialPosts : defaultPosts;
  const campaigns = initialCampaigns.length > 0 ? initialCampaigns : defaultCampaigns;

  // Volunteer form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) {
      toast.error("First Name and Email are required");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-form-id": "default"
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          message
        })
      });
      if (response.ok) {
        toast.success("Thank you for signing up! We will contact you soon.");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } else {
        toast.error("Failed to submit application");
      }
    } catch (err) {
      toast.error("Submission error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" suppressHydrationWarning>
      <MouseGlow />
      <LandingNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ClientMotion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered CRM for Modern Teams
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              The CRM that
              <span className="text-primary"> closes deals</span> while you
              sleep
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Manage contacts, automate workflows, and leverage AI to boost your
              sales. All in one beautiful, powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="#features">
                  See Features
                </Link>
              </Button>
            </div>
          </ClientMotion>

          {/* Hero Image */}
          <ClientMotion
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="relative rounded-xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-[2px]">
              <div className="rounded-lg bg-card border border-border/50 shadow-2xl overflow-hidden glass-panel">
                <Image
                  src="/elite-dashboard-v4.png"
                  alt="NanoSol CRM Dashboard Preview"
                  width={1200}
                  height={675}
                  priority
                  className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </ClientMotion>
        </div>
      </section>

      {/* Campaigns Section */}
      <section id="campaigns" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ClientMotion
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Our Active
              <span className="text-primary"> Donation Campaigns</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track our current progression and support our active community campaigns.
            </p>
          </ClientMotion>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {campaigns.map((camp, index) => {
              const goal = camp.goalAmount || 1;
              const current = camp.currentAmount || 0;
              const percent = Math.min(Math.round((current / goal) * 100), 100);

              return (
                <ClientMotion
                  key={camp.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow glass-panel">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Heart className="h-5 w-5 fill-current" />
                        <span className="font-semibold tracking-wider text-xs uppercase">Fundraiser</span>
                      </div>
                      <CardTitle className="text-xl font-bold">{camp.title}</CardTitle>
                      <CardDescription>{camp.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Raised: ${current.toLocaleString()}</span>
                          <span className="text-muted-foreground">Goal: ${goal.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                          <span>{percent}% Complete</span>
                          <Button size="sm" variant="link" className="p-0 h-auto font-bold text-primary">
                            Donate Now <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ClientMotion>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} className="h-full hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 glass-panel border-primary/10">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* News & Blog Section */}
      <section id="blog" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ClientMotion
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Latest News &
              <span className="text-primary"> Press Releases</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow along with our journey and read about recent impact stories.
            </p>
          </ClientMotion>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {posts.map((post) => (
              <Card key={post.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{post.title}</CardTitle>
                  <CardDescription>
                    Published {new Date(post.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm line-clamp-3">{post.content}</p>
                  <Button variant="link" size="sm" className="p-0 h-auto text-primary font-semibold">
                    Read Full Story <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteer Signup Form */}
      <section id="volunteer" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Join Us as a Volunteer</h2>
            <p className="text-muted-foreground mt-2">Help make a change in communities. Fill out the application below.</p>
          </div>

          <Card className="glass-panel border-white/5">
            <CardContent className="p-6">
              <form onSubmit={handleVolunteerSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="vfirst" className="text-xs font-semibold text-muted-foreground uppercase">First Name *</label>
                    <Input id="vfirst" required placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="vlast" className="text-xs font-semibold text-muted-foreground uppercase">Last Name</label>
                    <Input id="vlast" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="vemail" className="text-xs font-semibold text-muted-foreground uppercase">Email *</label>
                  <Input id="vemail" type="email" required placeholder="john.doe@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="vphone" className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                  <Input id="vphone" placeholder="+1 (555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label htmlFor="vmsg" className="text-xs font-semibold text-muted-foreground uppercase">Why do you want to join? (Message)</label>
                  <Textarea id="vmsg" placeholder="Tell us about yourself..." rows={3} value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary hover:bg-primary/95 text-white rounded-xl shadow-lg mt-2">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <ClientMotion
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by sales teams
              <span className="text-primary"> worldwide</span>
            </h2>
          </ClientMotion>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <ClientMotion
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-8">
                    <p className="text-lg mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </ClientMotion>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">NanoSol CRM</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 NanoSol CRM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
