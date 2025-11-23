-- Add RLS policy to allow employees to cancel their own leave
CREATE POLICY "Users can cancel own leaves"
ON public.leaves
FOR UPDATE
USING (
  employee_id = auth.uid() OR
  approved_by = auth.uid() OR
  partner_approved_by = auth.uid()
)
WITH CHECK (
  employee_id = auth.uid() OR
  approved_by = auth.uid() OR
  partner_approved_by = auth.uid()
);

-- Update the Partners policy to use position check instead of role
DROP POLICY IF EXISTS "Partners can cancel any leave" ON public.leaves;

CREATE POLICY "Partners can cancel any leave"
ON public.leaves
FOR UPDATE
USING (is_partner(auth.uid()))
WITH CHECK (is_partner(auth.uid()));