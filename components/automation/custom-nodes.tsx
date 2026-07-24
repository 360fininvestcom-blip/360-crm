"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Mail, Tag, Clock, GitBranch, Zap, PlusCircle, MessageSquare, Smartphone, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// BASE NODE WRAPPER
// ============================================
const NodeWrapper = ({ children, title, icon: Icon, color, selected }: { children: React.ReactNode, title: string, icon: LucideIcon, color: string, selected?: boolean }) => (
    <div className={cn(
        "flex flex-col min-w-[200px] bg-background border rounded-lg shadow-sm overflow-hidden transition-all",
        selected ? "ring-2 ring-primary border-primary" : "border-border",
    )}>
        <div className={cn("flex items-center gap-2 px-3 py-2 border-b", color)}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        </div>
        <div className="p-3">
            {children}
        </div>
    </div>
);

// ============================================
// TRIGGER NODE
// ============================================
export const TriggerNode = memo(({ data, selected }: NodeProps) => {
    return (
        <NodeWrapper title="Trigger" icon={Zap} color="bg-blue-500/10 text-blue-600" selected={selected}>
            <div className="text-sm font-medium">{data.triggerType || "Select Trigger..."}</div>
            <div className="text-xs text-muted-foreground mt-1">{data.description || "When this happens..."}</div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
        </NodeWrapper>
    );
});

// ============================================
// ACTION NODE
// ============================================
export const ActionNode = memo(({ data, selected }: NodeProps) => {
    const Icon = data.actionType === 'email' ? Mail : data.actionType === 'sms' ? MessageSquare : data.actionType === 'whatsapp' ? Smartphone : data.actionType === 'tag' ? Tag : PlusCircle;
    return (
        <NodeWrapper title="Action" icon={Icon} color="bg-green-500/10 text-green-600" selected={selected}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
            <div className="text-sm font-medium">{data.label || "Perform Action"}</div>
            <div className="text-xs text-muted-foreground mt-1">{data.actionDetail || "Do this step..."}</div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
        </NodeWrapper>
    );
});

// ============================================
// DELAY NODE
// ============================================
export const DelayNode = memo(({ data, selected }: NodeProps) => {
    return (
        <NodeWrapper title="Delay" icon={Clock} color="bg-yellow-500/10 text-yellow-600" selected={selected}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
            <div className="text-sm font-medium">{data.duration || "1"} {data.unit || "day(s)"}</div>
            <div className="text-xs text-muted-foreground mt-1">Wait before next step</div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
        </NodeWrapper>
    );
});

// ============================================
// CONDITION NODE
// ============================================
export const ConditionNode = memo(({ data, selected }: NodeProps) => {
    return (
        <NodeWrapper title="Condition" icon={GitBranch} color="bg-purple-500/10 text-purple-600" selected={selected}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
            <div className="text-sm font-medium">{data.condition || "Check if..."}</div>
            <div className="flex justify-between mt-4">
                <div className="relative flex flex-col items-center">
                    <span className="text-[10px] font-bold text-green-600 uppercase mb-1">Yes</span>
                    <Handle type="source" position={Position.Bottom} id="yes" className="w-3 h-3 bg-green-500" style={{ left: '25%' }} />
                </div>
                <div className="relative flex flex-col items-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase mb-1">No</span>
                    <Handle type="source" position={Position.Bottom} id="no" className="w-3 h-3 bg-red-500" style={{ left: '75%' }} />
                </div>
            </div>
        </NodeWrapper>
    );
});

TriggerNode.displayName = 'TriggerNode';
ActionNode.displayName = 'ActionNode';
DelayNode.displayName = 'DelayNode';
ConditionNode.displayName = 'ConditionNode';
