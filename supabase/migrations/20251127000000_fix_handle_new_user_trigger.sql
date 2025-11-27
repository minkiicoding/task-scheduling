-- Fix handle_new_user trigger to include employee_code and position from user_metadata

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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
