"use client";

import { useEffect, useRef } from "react";

export function useWaveform(
    containerRef: React.RefObject<HTMLDivElement | null>,
    stream: MediaStream | null,
    isActive: boolean,
    barCount: number = 20
) {
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) {
            // Reset heights to 4px
            if (containerRef.current) {
                const bars = containerRef.current.querySelectorAll("[data-bar]");
                bars.forEach(bar => {
                    (bar as HTMLElement).style.height = "4px";
                });
            }
            return;
        }

        const bars = containerRef.current.querySelectorAll("[data-bar]");

        if (!stream) {
            // Simulated mode for demo/active call without stream
            const simulate = () => {
                for (let i = 0; i < barCount; i++) {
                    const bar = bars[i] as HTMLElement;
                    if (bar) {
                        const heightPercent = Math.random() * 60 + 20;
                        bar.style.height = `${heightPercent}%`;
                    }
                }
                animationRef.current = requestAnimationFrame(simulate);
            };
            animationRef.current = requestAnimationFrame(simulate);
            return () => {
                if (animationRef.current) cancelAnimationFrame(animationRef.current);
            };
        }

        // Real Audio Analysis
        try {
            const AudioContextClass = window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            contextRef.current = new AudioContextClass();
            const source = contextRef.current.createMediaStreamSource(stream);
            analyzerRef.current = contextRef.current.createAnalyser();
            analyzerRef.current.fftSize = 256;
            source.connect(analyzerRef.current);

            const bufferLength = analyzerRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const update = () => {
                if (!analyzerRef.current) return;
                analyzerRef.current.getByteFrequencyData(dataArray);

                const step = Math.floor(bufferLength / barCount);
                for (let i = 0; i < barCount; i++) {
                    const bar = bars[i] as HTMLElement;
                    if (bar) {
                        const value = dataArray[i * step] || 0;
                        const heightPercent = (value / 255) * 80 + 10;
                        bar.style.height = `${heightPercent}%`;
                    }
                }
                animationRef.current = requestAnimationFrame(update);
            };

            update();
        } catch (err) {
            console.error("Waveform analysis error:", err);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (contextRef.current) contextRef.current.close().catch(() => { });
        };
    }, [stream, isActive, barCount, containerRef]);
}
