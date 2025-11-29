-- Ensure Admin exists in enum
ALTER TYPE public.employee_position ADD VALUE IF NOT EXISTS 'Admin';

-- Recreate trigger function with better error handling
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
  -- Log error and try fallback (insert without position)
  RAISE WARNING 'Error in handle_new_user (full insert): %. Retrying without position.', SQLERRM;
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
      -- If even that fails, just return new (user created, no profile)
      RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
