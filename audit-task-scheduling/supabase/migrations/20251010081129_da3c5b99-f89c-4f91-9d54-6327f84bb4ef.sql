-- Recreate cancel policies as permissive to avoid restrictive AND chaining
DROP POLICY IF EXISTS "Users can cancel own leaves" ON public.leaves;
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

-- Ensure partner policy is permissive
DROP POLICY IF EXISTS "Partners can cancel any leave" ON public.leaves;
CREATE POLICY "Partners can cancel any leave"
ON public.leaves
FOR UPDATE
USING (is_partner(auth.uid()))
WITH CHECK (is_partner(auth.uid()));