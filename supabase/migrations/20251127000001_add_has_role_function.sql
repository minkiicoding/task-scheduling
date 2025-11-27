-- Create has_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO anon;
