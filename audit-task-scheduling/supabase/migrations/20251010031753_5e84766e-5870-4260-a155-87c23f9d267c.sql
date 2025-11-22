-- Update RLS policies for better access control

-- Drop existing restrictive policies on leaves if they exist
DROP POLICY IF EXISTS "Managers can view all leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can view own leaves" ON public.leaves;

-- Create more comprehensive view policy for leaves
-- Allow users to view their own leaves OR if they are Supervisor+
CREATE POLICY "Users can view leaves"
ON public.leaves
FOR SELECT
USING (
  employee_id = auth.uid() 
  OR can_approve_leaves(auth.uid())
);

-- Ensure Supervisor+ can approve leaves (already exists but verify)
-- This policy should allow Supervisor+ to update status
DROP POLICY IF EXISTS "Managers can approve leaves" ON public.leaves;

CREATE POLICY "Supervisors can approve leaves"
ON public.leaves
FOR UPDATE
USING (can_approve_leaves(auth.uid()))
WITH CHECK (can_approve_leaves(auth.uid()));

-- Verify assignments policies are correct
-- Drop and recreate to ensure proper access
DROP POLICY IF EXISTS "Everyone can view assignments" ON public.assignments;

CREATE POLICY "Users can view assignments"
ON public.assignments
FOR SELECT
USING (
  auth.uid() = ANY(employee_ids)
  OR can_approve_leaves(auth.uid())
  OR can_user_edit(auth.uid())
);