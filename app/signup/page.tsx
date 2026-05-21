"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, ArrowRight, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        company: "",
        password: "",
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        company: formData.company,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            if (data.user) {
                // Check if email confirmation is required
                if (data.user.identities?.length === 0) {
                    toast.error("An account with this email already exists");
                } else if (data.session) {
                    // User is signed in immediately (email confirmation disabled)
                    toast.success("Account created successfully!");
                    router.push("/dashboard");
                    router.refresh();
                } else {
                    // Email confirmation required
                    toast.success("Check your email to confirm your account");
                    router.push("/login");
                }
            }
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            toast.error(error.message);
        }
    };

    const handleGitHubSignup = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] 2xl:w-[640px] lg:px-16 xl:px-24">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-full max-w-sm lg:w-96"
                >
                    <div className="flex items-center gap-2 mb-8">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                            <Sparkles className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">NanoSol CRM</span>
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight mb-2">Create your account</h2>
                    <p className="text-muted-foreground mb-8">
                        Start your 14-day free trial. No credit card required.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="font-medium">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Smith"
                                    value={formData.fullName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fullName: e.target.value })
                                    }
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-medium">Work Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company" className="font-medium">Company Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="company"
                                    type="text"
                                    placeholder="Acme Inc"
                                    value={formData.company}
                                    onChange={(e) =>
                                        setFormData({ ...formData, company: e.target.value })
                                    }
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-medium">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-medium btn-hover-effect shadow-md shadow-primary/20 mt-2" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Get started free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-4">
                            By signing up, you agree to our{" "}
                            <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
                            <Link href="/privacy" className="underline">Privacy Policy</Link>
                        </p>
                    </form>

                    <div className="relative my-8">
                        <Separator />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Or continue with
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" type="button" className="h-11 bg-muted/30 border-transparent hover:bg-muted btn-hover-effect" onClick={handleGoogleSignup}>
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" type="button" className="h-11 bg-muted/30 border-transparent hover:bg-muted btn-hover-effect" onClick={handleGitHubSignup}>
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </Button>
                    </div>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold text-primary hover:underline transition-all">
                            Sign in instead
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right Side - Visuals */}
            <div className="hidden lg:flex lg:flex-1 relative bg-muted overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-bl from-[#0B1021] via-[#1A1A3A] to-primary/80 z-0" />
                
                {/* Decorative glowing orb */}
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/40 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-500/30 rounded-full blur-[96px] pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 xl:p-24">
                    <div className="space-y-6 max-w-xl">
                        <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
                            Start closing deals faster today.
                        </h1>
                        <ul className="space-y-4">
                            {[
                                "Unlimited contacts and organizations",
                                "Visual pipelines with AI forecasting",
                                "Advanced automations and sequences",
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-lg text-white/80 font-medium">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-panel border-white/10 bg-black/20 p-8 rounded-2xl max-w-xl">
                        <div className="flex items-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <p className="text-xl text-white/90 font-medium leading-relaxed mb-6">
                            "The easiest CRM we've ever deployed. Our reps were fully onboarded in under 48 hours, and the email sequences are best-in-class."
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <span className="text-white font-semibold">SC</span>
                            </div>
                            <div>
                                <div className="text-white font-semibold">Sarah Chen</div>
                                <div className="text-white/60 text-sm">VP of Revenue at TechCorp</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
