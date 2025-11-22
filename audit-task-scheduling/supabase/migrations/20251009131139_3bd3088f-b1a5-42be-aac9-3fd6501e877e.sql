-- Add RLS policies so Management (by position) can view and approve leaves
CREATE POLICY "Managers can view all leaves"
ON public.leaves
FOR SELECT
USING (public.can_approve_leaves(auth.uid()));

CREATE POLICY "Managers can approve leaves"
ON public.leaves
FOR UPDATE
USING (public.can_approve_leaves(auth.uid()))
WITH CHECK (public.can_approve_leaves(auth.uid()));