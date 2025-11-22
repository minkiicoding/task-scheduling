-- Make job_type nullable for non-charge activities
ALTER TABLE public.assignments 
ALTER COLUMN job_type DROP NOT NULL;

-- Update existing non-charge activities to have null job_type
UPDATE public.assignments 
SET job_type = NULL 
WHERE activity_name IS NOT NULL AND client_id IS NULL;