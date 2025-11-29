-- Ensure columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position public.employee_position;

-- Simplify trigger to debug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert with minimal fields, avoid position to prevent sync trigger issues if any
  INSERT INTO public.profiles (id, email, name, employee_code)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'employee_code'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    employee_code = EXCLUDED.employee_code;
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
