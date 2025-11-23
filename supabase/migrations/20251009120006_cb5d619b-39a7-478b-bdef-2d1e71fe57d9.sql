-- Step 2: Add columns and policies using the new enum value
ALTER TABLE public.leaves 
ADD COLUMN IF NOT EXISTS partner_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS partner_approval_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Create policy for Partners to cancel any leave
CREATE POLICY "Partners can cancel any leave" 
ON public.leaves 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'));

-- Create function to check if user can approve leaves
CREATE OR REPLACE FUNCTION public.can_approve_leaves(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id 
    AND position IN ('Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner')
  )
$$;

-- Create function to check if user is Partner
CREATE OR REPLACE FUNCTION public.is_partner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id 
    AND position = 'Partner'
  )
$$;