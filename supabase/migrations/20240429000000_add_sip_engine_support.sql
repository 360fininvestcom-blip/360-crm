-- Migration: Add engine and Janus configuration to SIP profiles
-- This allows side-by-side usage of different WebRTC/SIP engines (e.g., Janus, Crococall)

-- 1. Add columns to sip_profiles
ALTER TABLE IF EXISTS public.sip_profiles 
ADD COLUMN IF NOT EXISTS engine TEXT DEFAULT 'janus' CHECK (engine IN ('janus', 'crococall', 'jssip')),
ADD COLUMN IF NOT EXISTS janus_url TEXT,
ADD COLUMN IF NOT EXISTS janus_secret TEXT;

-- 2. Backfill existing records
UPDATE public.sip_profiles 
SET 
  engine = 'janus', 
  janus_url = 'wss://sip.nanocall.space:8989' 
WHERE engine IS NULL;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
