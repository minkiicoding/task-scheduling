-- Create function to check if one user's position is higher than another
CREATE OR REPLACE FUNCTION public.is_position_higher_than(
  _user_id uuid,
  _target_employee_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH position_hierarchy AS (
    SELECT unnest(ARRAY[
      'A1', 'A2', 'Semi-Senior', 'Senior', 'Supervisor', 
      'Assistant Manager', 'Manager', 'Senior Manager', 'Partner', 'Admin'
    ]) AS position,
    generate_series(1, 10) AS level
  )
  SELECT 
    COALESCE(
      (SELECT ph1.level FROM position_hierarchy ph1 
       JOIN profiles p1 ON p1.position::text = ph1.position 
       WHERE p1.id = _user_id)
      >
      (SELECT ph2.level FROM position_hierarchy ph2 
       JOIN profiles p2 ON p2.position::text = ph2.position 
       WHERE p2.id = _target_employee_id),
      false
    );
$function$;

-- Update RLS policies for leaves table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can create own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Supervisors can approve leaves" ON public.leaves;
DROP POLICY IF EXISTS "Editors can manage all leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can cancel own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Partners can cancel any leave" ON public.leaves;

-- Policy for viewing leaves
-- Senior+ can view all leaves, others can only view their own
CREATE POLICY "Users can view leaves"
ON public.leaves
FOR SELECT
USING (
  employee_id = auth.uid() 
  OR is_senior_or_above(auth.uid())
  OR can_user_edit(auth.uid())
);

-- Policy for creating leaves
CREATE POLICY "Users can create own leaves"
ON public.leaves
FOR INSERT
WITH CHECK (
  employee_id = auth.uid()
  OR (can_user_edit(auth.uid()) AND is_position_higher_than(auth.uid(), employee_id))
  OR is_partner(auth.uid())
);

-- Policy for approving/updating leaves
-- Can approve if: Partner, Admin, or higher position than leave employee
CREATE POLICY "Users can update leaves"
ON public.leaves
FOR UPDATE
USING (
  employee_id = auth.uid()
  OR is_partner(auth.uid())
  OR can_user_edit(auth.uid())
  OR (is_senior_or_above(auth.uid()) AND is_position_higher_than(auth.uid(), employee_id))
);

-- Policy for deleting leaves
-- Can delete if: own leave (pending), or higher position (pending), or Partner/Editor
CREATE POLICY "Users can delete leaves"
ON public.leaves
FOR DELETE
USING (
  (employee_id = auth.uid() AND status = 'pending')
  OR (is_partner(auth.uid()) AND status = 'pending')
  OR (can_user_edit(auth.uid()) AND status = 'pending')
  OR (is_senior_or_above(auth.uid()) AND is_position_higher_than(auth.uid(), employee_id) AND status = 'pending')
);