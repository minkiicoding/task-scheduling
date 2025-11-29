-- Add partner approval columns to assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS partner_approval_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS partner_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create a table for public holidays
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on holidays table
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Create policies for holidays
CREATE POLICY "Everyone can view holidays" 
ON public.holidays 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage holidays" 
ON public.holidays 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

COMMENT ON TABLE public.holidays IS 'Public holidays that require partner approval for assignments';
COMMENT ON COLUMN public.assignments.partner_approval_required IS 'True if assignment requires partner approval (after 6pm, weekend, or holiday)';
COMMENT ON COLUMN public.assignments.partner_approved_by IS 'Partner who approved the assignment';
COMMENT ON COLUMN public.assignments.cancelled_by IS 'User who cancelled the assignment';
COMMENT ON COLUMN public.assignments.cancelled_at IS 'Timestamp when assignment was cancelled';