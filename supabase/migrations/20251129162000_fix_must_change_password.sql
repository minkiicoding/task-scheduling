
-- Update handle_new_user trigger to include must_change_password
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, employee_code, position, must_change_password)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'employee_code',
    (new.raw_user_meta_data->>'position')::public.employee_position,
    COALESCE((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    employee_code = EXCLUDED.employee_code,
    position = EXCLUDED.position,
    must_change_password = EXCLUDED.must_change_password;
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
