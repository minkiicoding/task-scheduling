-- Change job_type from enum to text to allow free-form input
ALTER TABLE public.assignments 
ALTER COLUMN job_type TYPE text USING job_type::text;

-- Change activity_name from enum to text to allow free-form input
ALTER TABLE public.assignments 
ALTER COLUMN activity_name TYPE text USING activity_name::text;

-- Add comment for clarity
COMMENT ON COLUMN public.assignments.job_type IS 'Free-form text field for assignment activity (e.g., Interim, Q1, YE, or any custom activity)';
COMMENT ON COLUMN public.assignments.activity_name IS 'Free-form text field for non-charge activity name (e.g., Training, Meeting, etc.)';