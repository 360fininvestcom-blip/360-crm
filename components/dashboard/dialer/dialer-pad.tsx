"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, User } from "lucide-react";

const dialpadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
];

const dialpadLetters: Record<string, string> = {
    "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ",
};

interface SearchResult {
    id: string;
    first_name: string;
    last_name?: string | null;
    phone?: string | null;
    company?: string | null;
}

interface DialerPadProps {
    currentNumber: string;
    onNumberChange: (num: string) => void;
    onKeyPress: (key: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    searchResults: SearchResult[];
    onQuickDial: (phone: string, name?: string) => void;
}

export const DialerPad = React.memo(({
    currentNumber,
    onNumberChange,
    onKeyPress,
    searchQuery,
    onSearchChange,
    searchResults,
    onQuickDial
}: DialerPadProps) => {
    return (
        <div className="space-y-4">
            <div className="relative">
                <Input
                    value={currentNumber}
                    onChange={(e) => onNumberChange(e.target.value)}
                    placeholder="Enter number..."
                    className="text-center text-2xl font-mono tracking-widest h-14 bg-muted/30 border-muted focus-visible:ring-primary/50"
                />
                {currentNumber && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                        onClick={() => onNumberChange("")}
                        title="Clear number"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search contacts..."
                        className="pl-9 h-9 text-sm bg-muted/20 border-none"
                    />
                </div>
                {searchQuery && searchResults.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                        {searchResults.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => onQuickDial(c.phone || "", `${c.first_name} ${c.last_name || ""}`.trim())}
                                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
                            >
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3 w-3 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{`${c.first_name} ${c.last_name || ""}`.trim()}</p>
                                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {dialpadKeys.flat().map((key) => (
                    <Button
                        key={key}
                        variant="outline"
                        className="h-14 text-lg font-semibold flex flex-col gap-0 hover:bg-primary/10 transition-all border-muted/50"
                        onClick={() => onKeyPress(key)}
                    >
                        <span>{key}</span>
                        {dialpadLetters[key] && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                                {dialpadLetters[key]}
                            </span>
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
});

DialerPad.displayName = "DialerPad";
