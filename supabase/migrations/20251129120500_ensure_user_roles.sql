-- Ensure app_role enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer', 'super_admin');
    END IF;
END$$;

-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Changed to auth.users to be safer, or profiles? Schema says profiles.
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add policies if missing (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Everyone can view user roles'
    ) THEN
        CREATE POLICY "Everyone can view user roles" ON public.user_roles FOR SELECT USING (true);
    END IF;
END$$;
