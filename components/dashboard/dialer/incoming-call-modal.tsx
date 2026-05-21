import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialerStore } from "@/lib/stores";

export function IncomingCallModal() {
    const { incomingCall, answerIncomingCall, declineIncomingCall } = useDialerStore();
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (incomingCall && ringtoneRef.current) {
            ringtoneRef.current.currentTime = 0;
            ringtoneRef.current.play().catch(e => console.error("Failed to play incoming ringtone:", e));
        } else if (!incomingCall && ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    }, [incomingCall]);

    const handleAnswer = async () => {
        if (!incomingCall || isProcessing) return;
        setIsProcessing(true);
        try {
            // First stop the ringtone
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current.currentTime = 0;
            }

            // Answer the call via SipService
            const { SipService } = await import("@/lib/services/sip-service");
            await SipService.getInstance().answer(incomingCall.jsep as RTCSessionDescriptionInit);

            // Update store state
            answerIncomingCall();
        } catch (error) {
            console.error("Failed to answer incoming call:", error);
            declineIncomingCall(); // clean up state
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { SipService } = await import("@/lib/services/sip-service");
            await SipService.getInstance().decline();
        } catch (error) {
            console.error("Failed to decline call cleanly:", error);
        } finally {
            declineIncomingCall(); // Clean up state regardless
            setIsProcessing(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {incomingCall && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[350px] bg-background/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden"
                    >
                        <div className="p-6 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 relative">
                                <span className="absolute inset-0 rounded-full border border-primary/50 animate-ping" />
                                <Phone className="h-8 w-8 text-primary animate-pulse" />
                            </div>

                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Incoming Call
                            </h2>
                            <p className="text-2xl font-bold mb-1">{incomingCall.name || "Unknown Caller"}</p>
                            <p className="text-muted-foreground mb-6 font-mono">{incomingCall.callerNumber}</p>

                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600 p-0 shadow-lg shadow-red-500/20"
                                    onClick={handleDecline}
                                    disabled={isProcessing}
                                >
                                    <PhoneOff className="h-6 w-6 text-white" />
                                </Button>
                                <Button
                                    size="lg"
                                    className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-600 p-0 shadow-lg shadow-green-500/20"
                                    onClick={handleAnswer}
                                    disabled={isProcessing}
                                >
                                    <Phone className="h-6 w-6 text-white fill-white" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden audio element for incoming ringtone */}
            <audio ref={ringtoneRef} loop preload="auto">
                {/* Standard ringtone, can be customized later */}
                <source src="/ringtone.wav" type="audio/wav" />
            </audio>
        </>
    );
}
