-- Create table for position role mappings
CREATE TABLE IF NOT EXISTS public.position_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position employee_position UNIQUE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.position_role_mappings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view mappings
CREATE POLICY "Everyone can view position role mappings"
ON public.position_role_mappings
FOR SELECT
TO authenticated
USING (true);

-- Only super_admin can manage mappings
CREATE POLICY "Super admins can manage position role mappings"
ON public.position_role_mappings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'::app_role
  )
);

-- Insert default mappings with updated roles
INSERT INTO public.position_role_mappings (position, role) VALUES
  ('Admin', 'super_admin'),
  ('Partner', 'admin'),
  ('Director', 'admin'),
  ('Senior Manager', 'editor'),
  ('Manager', 'editor'),
  ('Assistant Manager', 'editor'),
  ('Supervisor', 'editor'),
  ('Senior', 'editor'),
  ('Semi-Senior', 'viewer'),
  ('A2', 'viewer'),
  ('A1', 'viewer')
ON CONFLICT (position) DO UPDATE SET role = EXCLUDED.role;

-- Update sync_role_from_position to use the mapping table
CREATE OR REPLACE FUNCTION public.sync_role_from_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_role app_role;
BEGIN
  -- Get role from mapping table
  SELECT role INTO new_role
  FROM public.position_role_mappings
  WHERE position = NEW.position;
  
  -- If no mapping found, default to viewer
  IF new_role IS NULL THEN
    new_role := 'viewer'::app_role;
  END IF;
  
  -- Delete existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Assign role based on mapping
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role);
  
  RETURN NEW;
END;
$function$;

-- Trigger to sync existing profiles
DO $$
DECLARE
  profile_record RECORD;
  mapped_role app_role;
BEGIN
  FOR profile_record IN SELECT id, position FROM public.profiles LOOP
    -- Get role from mapping
    SELECT role INTO mapped_role
    FROM public.position_role_mappings
    WHERE position = profile_record.position;
    
    IF mapped_role IS NULL THEN
      mapped_role := 'viewer'::app_role;
    END IF;
    
    -- Update user role
    DELETE FROM public.user_roles WHERE user_id = profile_record.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (profile_record.id, mapped_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;