
-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy for reading clients (everyone authenticated)
DROP POLICY IF EXISTS "Everyone can view clients" ON public.clients;
CREATE POLICY "Everyone can view clients" ON public.clients FOR SELECT TO authenticated USING (true);

-- Policy for managing clients (admins and super_admins)
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);
