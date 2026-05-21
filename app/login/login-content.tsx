"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ClientMotionSSR as ClientMotion } from "@/components/landing/client-motion-ssr";

export default function LoginContent() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            if (data.user) {
                toast.success("Welcome back!");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
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

    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px] 2xl:w-[640px] lg:px-16 xl:px-24">
                <ClientMotion
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-full max-w-sm lg:w-96"
                >
                    <div className="flex items-center gap-2 mb-10">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                            <Sparkles className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">NanoSol CRM</span>
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h2>
                    <p className="text-muted-foreground mb-8">
                        Sign in to your account to continue
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-medium">Email address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="font-medium">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-colors"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-medium btn-hover-effect shadow-md shadow-primary/20" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative my-8">
                        <Separator />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Or continue with
                        </span>
                    </div>

                    <Button variant="outline" type="button" className="w-full h-11 bg-muted/30 border-transparent hover:bg-muted btn-hover-effect" onClick={handleGoogleLogin}>
                        <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                    </Button>

                    <p className="mt-10 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-semibold text-primary hover:underline transition-all">
                            Create an account
                        </Link>
                    </p>
                </ClientMotion>
            </div>

            {/* Right Side - Visuals */}
            <div className="hidden lg:flex lg:flex-1 relative bg-muted overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0B1021] via-[#1A1A3A] to-primary/80 z-0" />
                
                {/* Decorative glowing orb */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/40 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/30 rounded-full blur-[96px] pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 xl:p-24">
                    <div className="space-y-6 max-w-xl">
                        <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
                            The intelligent OS for modern sales teams.
                        </h1>
                        <ul className="space-y-4">
                            {[
                                "AI-powered contact scoring & enrichment",
                                "Drag-and-drop visual pipeline management",
                                "Built-in SIP dialer & automated email sequences",
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
                            "NanoSol completely transformed how we handle inbound leads. The AI scoring lets my team focus on deals that actually close. We doubled our conversion rate in 3 months."
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <span className="text-white font-semibold">MT</span>
                            </div>
                            <div>
                                <div className="text-white font-semibold">Michael Torres</div>
                                <div className="text-white/60 text-sm">VP of Sales at GrowthCo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
