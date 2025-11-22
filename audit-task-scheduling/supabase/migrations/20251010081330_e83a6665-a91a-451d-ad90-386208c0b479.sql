-- Add 'cancelled' status to the leaves status check constraint
ALTER TABLE public.leaves DROP CONSTRAINT IF EXISTS leaves_status_check;
ALTER TABLE public.leaves ADD CONSTRAINT leaves_status_check 
CHECK (status = ANY (ARRAY['approved'::text, 'pending'::text, 'cancelled'::text]));