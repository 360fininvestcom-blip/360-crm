"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { ClientMotionSSR as ClientMotion } from "@/components/landing/client-motion-ssr";

export default function ForgotPasswordContent() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await authClient.forgetPassword({
                email,
                redirectTo: "/reset-password",
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            setIsSent(true);
            toast.success("Password reset link sent!");
        } catch (error) {
            console.error("Forgot password error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background items-center justify-center p-4">
            <ClientMotion
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 mb-6">
                        <Sparkles className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
                    <p className="text-muted-foreground">
                        {isSent 
                            ? "Check your email for a link to reset your password." 
                            : "Enter your email address and we'll send you a recovery link."}
                    </p>
                </div>

                <div className="glass-panel p-8 rounded-2xl border bg-card text-card-foreground shadow-sm">
                    {isSent ? (
                        <div className="space-y-6">
                            <div className="bg-primary/10 p-4 rounded-lg text-sm text-primary font-medium text-center">
                                We've sent an email to {email} with instructions to reset your password.
                            </div>
                            <Button asChild className="w-full h-11" variant="outline">
                                <Link href="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to login
                                </Link>
                            </Button>
                        </div>
                    ) : (
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
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base font-medium btn-hover-effect shadow-md shadow-primary/20" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center mt-6">
                                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-center">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </ClientMotion>
        </div>
    );
}
