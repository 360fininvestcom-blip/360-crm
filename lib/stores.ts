import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== UI Store =====
interface UIState {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    mobileSidebarOpen: boolean;
    theme: "light" | "dark" | "system";
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setMobileSidebarOpen: (open: boolean) => void;
    setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            sidebarCollapsed: false,
            mobileSidebarOpen: false,
            theme: "system",
            toggleSidebar: () =>
                set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: "nanosol-ui-storage",
        }
    )
);

// ===== Dialer Store (for SIP Widget) =====
interface DialerState {
    isOpen: boolean;
    isInCall: boolean;
    currentNumber: string;
    callDuration: number;
    callStatus: "idle" | "connecting" | "ringing" | "active" | "ended";
    lastCallStatus: "answered" | "no-answer" | "busy" | "failed" | "rejected" | "skipped" | null;
    callStartedAt: string | null;
    callEndedAt: string | null;
    incomingCall: { callerNumber: string; jsep: unknown; handleId: number; name?: string } | null;
    autoDialerQueue: { number: string; name: string; lastStatus?: string }[];
    autoDialerActive: boolean;
    callTimerInterval: ReturnType<typeof setInterval> | null;
    openDialer: () => void;
    closeDialer: () => void;
    setCurrentNumber: (number: string) => void;
    setIncomingCall: (call: { callerNumber: string; jsep: unknown; handleId: number; name?: string } | null) => void;
    answerIncomingCall: () => void;
    declineIncomingCall: () => void;
    startCall: () => void;
    endCall: (status?: "answered" | "no-answer" | "busy" | "failed" | "rejected" | "skipped") => void;
    setCallStatus: (status: DialerState["callStatus"]) => void;
    incrementCallDuration: () => void;
    startCallTimer: () => void;
    stopCallTimer: () => void;
    setAutoDialerQueue: (queue: { number: string; name: string }[]) => void;
    updateQueueStatus: (number: string, status: "answered" | "no-answer" | "busy" | "failed" | "skipped" | "forward" | "ringback" | "rejected") => void;
    startAutoDialer: () => void;
    stopAutoDialer: () => void;
    nextAutoDialNumber: () => { number: string; name: string } | undefined;
    isAutoDialerPaused: boolean;
    toggleAutoDialerPause: () => void;
    terminateAutoDialer: () => void;
    skipCurrent: () => void;
    selectedSipAccountId: string | null;
    setSelectedSipAccountId: (id: string | null) => void;
    selectedMicrophoneId: string | null;
    setSelectedMicrophoneId: (id: string | null) => void;
    selectedSpeakerId: string | null;
    setSelectedSpeakerId: (id: string | null) => void;
}

export const useDialerStore = create(
    persist<DialerState>(
        (set, get) => ({
            isOpen: false,
            isInCall: false,
            currentNumber: "",
            callDuration: 0,
            callStatus: "idle",
            lastCallStatus: null,
            callStartedAt: null,
            callEndedAt: null,
            incomingCall: null,
            autoDialerQueue: [],
            autoDialerActive: false,
            callTimerInterval: null,
            openDialer: () => set({ isOpen: true }),
            closeDialer: () => set({ isOpen: false }),
            setCurrentNumber: (number) => set({ currentNumber: number }),
            setIncomingCall: (call) => set({ incomingCall: call }),
            answerIncomingCall: () => {
                const call = get().incomingCall;
                if (!call) return;
                set({ incomingCall: null, isOpen: true, isInCall: true, callStatus: "connecting", currentNumber: call.callerNumber, callDuration: 0, lastCallStatus: null });
            },
            declineIncomingCall: () => {
                set({ incomingCall: null });
            },
            startCall: () => set({
                isOpen: true,
                isInCall: true,
                callStatus: "connecting",
                callDuration: 0,
                callStartedAt: null,
                callEndedAt: null,
                lastCallStatus: null
            }),
            endCall: (status) => {
                if (get().callStatus === "ended") return;
                get().stopCallTimer();
                const currentStatus = get().callStatus;
                const resolvedStatus = status || (currentStatus === "active" ? "answered" : "no-answer");
                set({ isInCall: false, callStatus: "ended", callEndedAt: new Date().toISOString(), lastCallStatus: resolvedStatus });
            },
            setCallStatus: (status) => {
                set({ callStatus: status });
                // Start timer when call becomes active
                if (status === "active") {
                    set({ callStartedAt: new Date().toISOString() });
                    get().startCallTimer();
                }
            },
            incrementCallDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),
            startCallTimer: () => {
                const currentInterval = get().callTimerInterval;
                if (currentInterval) clearInterval(currentInterval);
                const interval = setInterval(() => {
                    get().incrementCallDuration();
                }, 1000);
                set({ callTimerInterval: interval });
            },
            stopCallTimer: () => {
                const interval = get().callTimerInterval;
                if (interval) {
                    clearInterval(interval);
                    set({ callTimerInterval: null });
                }
            },
            setAutoDialerQueue: (queue) => set({ autoDialerQueue: queue }),
            updateQueueStatus: (number, status) => set((state) => ({
                autoDialerQueue: state.autoDialerQueue.map(item =>
                    item.number === number ? { ...item, lastStatus: status } : item
                )
            })),
            startAutoDialer: () => set({ autoDialerActive: true }),
            stopAutoDialer: () => set({ autoDialerActive: false }),
            isAutoDialerPaused: false,
            toggleAutoDialerPause: () => set((state) => ({ isAutoDialerPaused: !state.isAutoDialerPaused })),
            terminateAutoDialer: () => set({ autoDialerActive: false, isAutoDialerPaused: false, autoDialerQueue: [] }),
            nextAutoDialNumber: () => {
                const state = get();
                // If paused, don't advance
                if (state.isAutoDialerPaused) return undefined;

                const queue = state.autoDialerQueue;
                const pending = queue.filter(q => !q.lastStatus);
                if (pending.length === 0) return undefined;
                const next = pending[0];
                set({ currentNumber: next.number });
                return next;
            },
            skipCurrent: () => {
                const state = get();
                if (state.currentNumber) {
                    // Mark current as skipped
                    state.updateQueueStatus(state.currentNumber, "skipped");
                    // End call if active
                    if (state.isInCall) {
                        state.endCall();
                    }
                    // Clear current number to trigger next fetch
                    set({ currentNumber: "" });
                }
            },
            selectedSipAccountId: null,
            setSelectedSipAccountId: (id) => set({ selectedSipAccountId: id }),
            selectedMicrophoneId: null,
            setSelectedMicrophoneId: (id) => set({ selectedMicrophoneId: id }),
            selectedSpeakerId: null,
            setSelectedSpeakerId: (id) => set({ selectedSpeakerId: id }),
        }),
        {
            name: "nanosol-dialer-storage",
            partialize: (state) => ({
                selectedSipAccountId: state.selectedSipAccountId,
                selectedMicrophoneId: state.selectedMicrophoneId,
                selectedSpeakerId: state.selectedSpeakerId,
            }) as DialerState,
        }
    )
);

// ===== Command Palette Store =====
interface CommandPaletteState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
