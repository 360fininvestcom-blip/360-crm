"use client";

import { useEffect, useState, useRef } from "react";
import { Mic, Volume2, PlayCircle, AlertCircle } from "lucide-react";
import { useDialerStore } from "@/lib/stores";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AudioDeviceSettings() {
    const {
        selectedMicrophoneId,
        setSelectedMicrophoneId,
        selectedSpeakerId,
        setSelectedSpeakerId,
    } = useDialerStore();

    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
    const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
    const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        let activeStream: MediaStream | null = null;

        // Enumerate devices helper
        const loadDevices = async () => {
            try {
                // Requesting permission is often required first to see device labels
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                activeStream = stream;
                setPermissionGranted(true);

                const devices = await navigator.mediaDevices.enumerateDevices();
                const mics = devices.filter(device => device.kind === "audioinput");
                const spkrs = devices.filter(device => device.kind === "audiooutput");

                setMicrophones(mics);
                setSpeakers(spkrs);

                // Auto-select first if none selected without causing dependency re-runs
                const store = useDialerStore.getState();
                if (!store.selectedMicrophoneId && mics.length > 0) {
                    store.setSelectedMicrophoneId(mics[0].deviceId);
                }
                if (!store.selectedSpeakerId && spkrs.length > 0) {
                    store.setSelectedSpeakerId(spkrs[0].deviceId);
                }
            } catch (err) {
                console.warn("Audio device access denied or unavailable", err);
                setPermissionGranted(false);
            }
        };

        loadDevices();

        // Listen for device changes (plugging in a headset, etc)
        const handleDeviceChange = () => {
            loadDevices();
        };

        navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [setSelectedMicrophoneId, setSelectedSpeakerId]);

    const playTestSound = async () => {
        if (!audioRef.current) return;

        try {
            // Only edge/chrome support setSinkId typically natively on desktop right now 
            const audioElem = audioRef.current as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
            if (typeof audioElem.setSinkId === 'function' && selectedSpeakerId) {
                await audioElem.setSinkId(selectedSpeakerId);
            }

            setIsPlaying(true);
            audioRef.current.currentTime = 0;
            await audioRef.current.play();
        } catch (error) {
            console.error("Error playing test sound:", error);
            setIsPlaying(false);
        }
    };

    return (
        <div className="space-y-6">
            {!permissionGranted && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Microphone access is required to see available audio devices. Please allow permissions in your browser.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary" /> Microphone Input
                </Label>
                <Select
                    value={selectedMicrophoneId || undefined}
                    onValueChange={setSelectedMicrophoneId}
                    disabled={!permissionGranted || microphones.length === 0}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a microphone" />
                    </SelectTrigger>
                    <SelectContent>
                        {microphones.map((mic) => (
                            <SelectItem key={mic.deviceId} value={mic.deviceId}>
                                {mic.label || `Microphone (${mic.deviceId.slice(0, 5)}...)`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" /> Speaker Output
                </Label>
                <Select
                    value={selectedSpeakerId || undefined}
                    onValueChange={setSelectedSpeakerId}
                    disabled={speakers.length === 0} // Output enum sometimes allowed without permission
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a speaker" />
                    </SelectTrigger>
                    <SelectContent>
                        {speakers.map((spkr) => (
                            <SelectItem key={spkr.deviceId} value={spkr.deviceId}>
                                {spkr.label || `Speaker (${spkr.deviceId.slice(0, 5)}...)`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex justify-end pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={playTestSound}
                        disabled={isPlaying || speakers.length === 0}
                        className="text-xs"
                    >
                        <PlayCircle className="h-4 w-4 mr-2 text-primary" />
                        Test Audio Output
                    </Button>
                </div>
            </div>

            {/* Hidden audio element for the test sound */}
            <audio
                ref={audioRef}
                src="/ringtone.wav"
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />
        </div>
    );
}
