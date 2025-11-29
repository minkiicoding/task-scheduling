-- Re-create get_email_by_employee_code function
CREATE OR REPLACE FUNCTION public.get_email_by_employee_code(_employee_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT email
    FROM public.profiles
    WHERE employee_code = _employee_code
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_employee_code TO anon, authenticated;

-- Re-create handle_new_user function just in case
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, employee_code, position)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'employee_code',
    (new.raw_user_meta_data->>'position')::public.employee_position
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    employee_code = EXCLUDED.employee_code,
    position = EXCLUDED.position;
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
