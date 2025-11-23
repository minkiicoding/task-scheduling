-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
-- Create Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer', 'super_admin');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_position') THEN
        CREATE TYPE public.employee_position AS ENUM ('A1', 'A2', 'Semi-Senior', 'Senior', 'Supervisor', 'AM', 'M', 'SM', 'Partner', 'System Admin', 'Assistant Manager', 'Manager', 'Senior Manager', 'Admin', 'Director');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
        CREATE TYPE public.job_type AS ENUM ('Interim', 'นับ Stock', 'Q1', 'Q2', 'Q3', 'Year-End Audit', 'YE', 'อื่น ๆ');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type') THEN
        CREATE TYPE public.leave_type AS ENUM ('Annual Leave', 'Personal Leave', 'Sick Leave', 'CPA Leave');
    END IF;
END$$;

-- Create Tables

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  employee_code text,
  name text NOT NULL,
  position public.employee_position,
  must_change_password boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  client_code text,
  color_class text NOT NULL DEFAULT 'bg-gray-100',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  employee_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  job_type text,
  activity_name text,
  approved_by uuid,
  partner_approval_required boolean DEFAULT false,
  partner_approved_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- LEAVES
CREATE TABLE IF NOT EXISTS public.leaves (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  leave_type public.leave_type NOT NULL DEFAULT 'Annual Leave',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  partner_approval_required boolean DEFAULT false,
  partner_approved_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- USER_ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HOLIDAYS
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  date date NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- POSITION_ROLE_MAPPINGS
CREATE TABLE IF NOT EXISTS public.position_role_mappings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  position public.employee_position UNIQUE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.position_role_mappings ENABLE ROW LEVEL SECURITY;

-- PASSWORD_RESET_REQUESTS
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;


-- RLS POLICIES (Basic set based on migrations)

-- Profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;
CREATE POLICY "Everyone can view profiles" ON public.profiles FOR SELECT USING (true);

-- Leaves
DROP POLICY IF EXISTS "All users can view leaves" ON public.leaves;
CREATE POLICY "All users can view leaves" ON public.leaves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own leaves" ON public.leaves;
CREATE POLICY "Users can create own leaves" ON public.leaves FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can update own leaves" ON public.leaves;
CREATE POLICY "Users can update own leaves" ON public.leaves FOR UPDATE USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can delete own leaves" ON public.leaves;
CREATE POLICY "Users can delete own leaves" ON public.leaves FOR DELETE USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Editors can manage all leaves" ON public.leaves;
CREATE POLICY "Editors can manage all leaves" ON public.leaves FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'admin', 'super_admin'))
);

-- Assignments
DROP POLICY IF EXISTS "All users can view assignments" ON public.assignments;
CREATE POLICY "All users can view assignments" ON public.assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors can create assignments" ON public.assignments;
CREATE POLICY "Editors can create assignments" ON public.assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Editors can update assignments" ON public.assignments;
CREATE POLICY "Editors can update assignments" ON public.assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Editors can delete assignments" ON public.assignments;
CREATE POLICY "Editors can delete assignments" ON public.assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('editor', 'admin', 'super_admin'))
);

-- Holidays
DROP POLICY IF EXISTS "Everyone can view holidays" ON public.holidays;
CREATE POLICY "Everyone can view holidays" ON public.holidays FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage holidays" ON public.holidays;
CREATE POLICY "Admins can manage holidays" ON public.holidays FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Position Role Mappings
DROP POLICY IF EXISTS "Everyone can view position role mappings" ON public.position_role_mappings;
CREATE POLICY "Everyone can view position role mappings" ON public.position_role_mappings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can manage position role mappings" ON public.position_role_mappings;
CREATE POLICY "Super admins can manage position role mappings" ON public.position_role_mappings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- FUNCTIONS

-- Function to handle new user signup (Trigger)
-- Function to handle new user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sync role from position function
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

-- Trigger for sync role
DROP TRIGGER IF EXISTS sync_user_role_on_profile_update ON public.profiles;
CREATE TRIGGER sync_user_role_on_profile_update
  AFTER INSERT OR UPDATE OF position ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_from_position();

-- Insert default position mappings
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
