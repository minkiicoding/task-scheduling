-- Ensure update policies on leaves are permissive (not restrictive) so employees can cancel their own leave
-- Recreate supervisors and editors policies as permissive

-- Drop and recreate Supervisors policy as permissive
DROP POLICY IF EXISTS "Supervisors can approve leaves" ON public.leaves;
CREATE POLICY "Supervisors can approve leaves"
ON public.leaves
FOR UPDATE
USING (can_approve_leaves(auth.uid()))
WITH CHECK (can_approve_leaves(auth.uid()));

-- Drop and recreate Editors manage policy as permissive for all commands
DROP POLICY IF EXISTS "Editors can manage all leaves" ON public.leaves;
CREATE POLICY "Editors can manage all leaves"
ON public.leaves
FOR ALL
USING (can_user_edit(auth.uid()))
WITH CHECK (can_user_edit(auth.uid()));