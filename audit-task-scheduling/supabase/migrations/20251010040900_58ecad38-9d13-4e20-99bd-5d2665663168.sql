-- Create function to check if user is Senior or above
CREATE OR REPLACE FUNCTION public.is_senior_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id 
    AND position IN ('Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner', 'Admin')
  )
$$;

-- Update policy to allow Senior+ to view all assignments
DROP POLICY IF EXISTS "Users can view assignments" ON public.assignments;

CREATE POLICY "Users can view assignments"
ON public.assignments
FOR SELECT
USING (
  (auth.uid() = ANY (employee_ids)) 
  OR can_approve_leaves(auth.uid()) 
  OR can_user_edit(auth.uid())
  OR is_senior_or_above(auth.uid())
);

-- Update policy to allow Senior+ to create assignments
DROP POLICY IF EXISTS "Editors can create assignments" ON public.assignments;

CREATE POLICY "Editors can create assignments"
ON public.assignments
FOR INSERT
WITH CHECK (
  can_user_edit(auth.uid())
  OR is_senior_or_above(auth.uid())
);

-- Update policy to allow Senior+ to update assignments
DROP POLICY IF EXISTS "Editors can update assignments" ON public.assignments;

CREATE POLICY "Editors can update assignments"
ON public.assignments
FOR UPDATE
USING (
  can_user_edit(auth.uid())
  OR is_senior_or_above(auth.uid())
);

-- Update policy to allow Senior+ to delete assignments
DROP POLICY IF EXISTS "Editors can delete assignments" ON public.assignments;

CREATE POLICY "Editors can delete assignments"
ON public.assignments
FOR DELETE
USING (
  can_user_edit(auth.uid())
  OR is_senior_or_above(auth.uid())
);