-- Enable uuid-ossp if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add tracking columns to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT FALSE;

-- Twilio Configurations
CREATE TABLE twilio_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    account_sid TEXT NOT NULL,
    auth_token_encrypted TEXT NOT NULL,
    from_number TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

-- Email Background Queue
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- SMS Background Queue
CREATE TABLE sms_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    to_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE twilio_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their org twilio_configs" ON twilio_configs FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their org twilio_configs" ON twilio_configs FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their org twilio_configs" ON twilio_configs FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their org twilio_configs" ON twilio_configs FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their org email_queue" ON email_queue FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their org email_queue" ON email_queue FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their org email_queue" ON email_queue FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their org email_queue" ON email_queue FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their org sms_queue" ON sms_queue FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their org sms_queue" ON sms_queue FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their org sms_queue" ON sms_queue FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their org sms_queue" ON sms_queue FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));
