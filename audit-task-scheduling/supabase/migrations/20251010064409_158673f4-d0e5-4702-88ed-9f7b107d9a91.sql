-- Drop the old constraint that doesn't allow both client_id and activity_name
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS check_client_or_activity;

-- Add new constraint that requires at least one of client_id or activity_name
-- This allows both to be present for client assignments with custom job types
ALTER TABLE public.assignments ADD CONSTRAINT check_client_or_activity 
CHECK (client_id IS NOT NULL OR activity_name IS NOT NULL);