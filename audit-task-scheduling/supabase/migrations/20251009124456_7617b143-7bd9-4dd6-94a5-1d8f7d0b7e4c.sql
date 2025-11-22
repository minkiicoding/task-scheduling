-- Make client_id nullable to support non-charge activities
ALTER TABLE public.assignments 
ALTER COLUMN client_id DROP NOT NULL;

-- Add activity_name column for non-charge activities
ALTER TABLE public.assignments 
ADD COLUMN activity_name TEXT;

-- Add check constraint to ensure either client_id or activity_name is provided
ALTER TABLE public.assignments
ADD CONSTRAINT check_client_or_activity 
CHECK (
  (client_id IS NOT NULL AND activity_name IS NULL) OR 
  (client_id IS NULL AND activity_name IS NOT NULL)
);