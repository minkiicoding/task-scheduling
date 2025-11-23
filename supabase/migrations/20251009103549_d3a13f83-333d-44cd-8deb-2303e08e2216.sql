-- Create leave type enum
CREATE TYPE public.leave_type AS ENUM ('Annual Leave', 'Personal Leave', 'Sick Leave', 'CPA Leave');

-- Add leave_type column to leaves table
ALTER TABLE public.leaves 
ADD COLUMN leave_type leave_type NOT NULL DEFAULT 'Annual Leave';

-- Create edge function to handle admin user creation
-- This will be called after the first admin signs up

-- Create a function to create users (only callable by admin)
CREATE OR REPLACE FUNCTION public.create_user_account(
  _employee_code TEXT,
  _name TEXT,
  _position employee_position,
  _email TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _temp_email text;
  _result json;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create user accounts';
  END IF;

  -- Generate temporary email if not provided
  _temp_email := COALESCE(_email, _employee_code || '@temp.local');

  -- Return instruction to use edge function instead
  RETURN json_build_object(
    'success', false,
    'message', 'Please use the create-user edge function instead'
  );
END;
$$;

-- Create admin user with default credentials
-- Note: This will need to be set up through Supabase Auth
-- The edge function will handle the actual user creation

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_account TO authenticated;