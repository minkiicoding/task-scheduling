-- Create function to sync role from position
CREATE OR REPLACE FUNCTION public.sync_role_from_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing roles for this user
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Assign role based on position
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.position = 'Admin' THEN 'super_admin'::app_role
      WHEN NEW.position IN ('Partner', 'Senior Manager') THEN 'admin'::app_role
      WHEN NEW.position IN ('Manager', 'Assistant Manager', 'Supervisor', 'Senior', 'Director') THEN 'editor'::app_role
      ELSE 'viewer'::app_role
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically sync role when position changes
DROP TRIGGER IF EXISTS sync_role_on_position_change ON public.profiles;
CREATE TRIGGER sync_role_on_position_change
  AFTER INSERT OR UPDATE OF position ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_from_position();

-- Sync existing profiles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, position FROM public.profiles LOOP
    DELETE FROM public.user_roles WHERE user_id = profile_record.id;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      profile_record.id,
      CASE 
        WHEN profile_record.position = 'Admin' THEN 'super_admin'::app_role
        WHEN profile_record.position IN ('Partner', 'Senior Manager') THEN 'admin'::app_role
        WHEN profile_record.position IN ('Manager', 'Assistant Manager', 'Supervisor', 'Senior', 'Director') THEN 'editor'::app_role
        ELSE 'viewer'::app_role
      END
    );
  END LOOP;
END $$;