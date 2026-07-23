// Core Entity Types for NanoSol CRM

import type {
    Organization,
    Profile,
    ContactStatus,
    Pipeline,
    Activity,
    CalendarEvent,
    SipProfile as SIPProfile,
    SmtpConfig as SMTPConfig,
    EmailTemplate,
    EmailSequence,
    SequenceEnrollment,
    AutomationRule,
    Contact as PrismaContact,
    Deal as PrismaDeal,
    Task as PrismaTask,
    Note as PrismaDealNote
} from "@prisma/client";

// Re-export exact Prisma models for the ones that don't need relation joins
export type {
    Organization,
    Profile,
    ContactStatus,
    Pipeline,
    Activity,
    CalendarEvent,
    SIPProfile,
    SMTPConfig,
    EmailTemplate,
    EmailSequence,
    SequenceEnrollment,
    AutomationRule
};

// Types with joined relations
export type Contact = PrismaContact & {
    // any joined relations can go here if needed in the future
};

export type Deal = PrismaDeal & {
    contact?: Partial<PrismaContact> | null;
};

export type Task = PrismaTask & {
    assignedTo?: Partial<Profile> | null;
    contact?: Partial<PrismaContact> | null;
    deal?: Partial<PrismaDeal> | null;
};

export type DealNote = PrismaDealNote & {
    author?: {
        fullName: string | null;
        avatarUrl: string | null;
    };
};

export interface PipelineStage {
    id: string;
    name: string;
    order: number;
    color?: string;
}

// Activity Type (Prisma Activity has type String, but UI expects specific strings)
export type ActivityType =
    | "call"
    | "email"
    | "note"
    | "meeting"
    | "task"
    | "page_visit"
    | "file_upload"
    | "system";

// Manual Definitions for entities not yet migrated to Prisma Schema 
// (Fetched via $queryRaw, returning snake_case)

export interface WebForm {
    id: string;
    organization_id: string;
    name: string;
    source: string;
    redirect_url: string | null;
    status: "active" | "inactive";
    config: Record<string, string>;
    created_at: string;
}

export interface Email {
    id: string;
    account_id: string;
    organization_id: string;
    from_name?: string;
    from_addr: string;
    to_addr: string;
    subject?: string;
    body_text?: string;
    body_html?: string;
    folder: "inbox" | "sent" | "archive" | "trash";
    is_read: boolean;
    has_attachment: boolean;
    opened_at?: string;
    clicked_at?: string;
    open_count?: number;
    click_count?: number;
    received_at: string;
    created_at: string;
}

export interface EmailTrackingEvent {
    id: string;
    email_id: string;
    event_type: "open" | "click";
    link_url?: string;
    user_agent?: string;
    ip_address?: string;
    created_at: string;
}

export interface EmailSequenceStep {
    id: string;
    order: number;
    delay_days: number;
    delay_unit?: 'minutes' | 'hours' | 'days';
    template_id: string;
    subject_override?: string;
}

// Automation (Raw tables)
export interface Workflow {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    nodes: unknown[]; 
    edges: unknown[]; 
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkflowRun {
    id: string;
    organization_id: string;
    workflow_id: string;
    contact_id: string;
    status: 'running' | 'completed' | 'failed' | 'waiting';
    current_node_id?: string;
    last_executed_at: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface AutomationAction {
    id: string;
    type: string;
    config: Record<string, unknown>;
    order: number;
}

// Call Logs (Raw table)
export interface CallLog {
    id: string;
    organization_id: string;
    user_id?: string;
    contact_id?: string;
    phone_number: string;
    direction: "inbound" | "outbound";
    status: "completed" | "missed" | "failed" | "no_answer" | "busy";
    duration_seconds: number;
    outcome?: string;
    notes?: string;
    recording_url?: string;
    transcription?: string | null;
    summary?: string | null;
    started_at: string;
    ended_at?: string;
    created_at: string;
    contact?: {
        id: string;
        first_name: string;
        last_name?: string | null;
    } | null;
}

// API Keys for AI Providers
export type AIProvider = "openai" | "gemini" | "qwen" | "kimi";

export interface APIKeys {
    id: string;
    organization_id: string;
    openai_key_encrypted?: string;
    gemini_key_encrypted?: string;
    qwen_key_encrypted?: string;
    kimi_key_encrypted?: string;
    crm_api_key?: string;
    active_provider: AIProvider;
    created_at: string;
    updated_at: string;
}

export interface UserIntegration {
    id: string;
    userId: string;
    organizationId: string;
    provider: "google" | "outlook";
    externalEmail?: string | null;
    expiresAt?: Date | string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}
