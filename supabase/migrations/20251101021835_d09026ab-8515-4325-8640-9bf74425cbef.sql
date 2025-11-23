-- Update can_user_edit function to include super_admin
CREATE OR REPLACE FUNCTION public.can_user_edit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'editor', 'super_admin')
  )
$$;