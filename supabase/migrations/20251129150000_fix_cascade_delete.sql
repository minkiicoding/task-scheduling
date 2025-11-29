
-- Fix profiles foreign key
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Fix user_roles foreign key (ensure it cascades)
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Fix assignments foreign keys
-- Assuming employee_id references profiles(id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'employee_id') THEN
        ALTER TABLE public.assignments
        DROP CONSTRAINT IF EXISTS assignments_employee_id_fkey,
        ADD CONSTRAINT assignments_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Fix assignments approver/canceller (Set Null)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'partner_approved_by') THEN
        ALTER TABLE public.assignments
        DROP CONSTRAINT IF EXISTS assignments_partner_approved_by_fkey,
        ADD CONSTRAINT assignments_partner_approved_by_fkey
        FOREIGN KEY (partner_approved_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'cancelled_by') THEN
        ALTER TABLE public.assignments
        DROP CONSTRAINT IF EXISTS assignments_cancelled_by_fkey,
        ADD CONSTRAINT assignments_cancelled_by_fkey
        FOREIGN KEY (cancelled_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Fix leaves foreign keys
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'employee_id') THEN
        ALTER TABLE public.leaves
        DROP CONSTRAINT IF EXISTS leaves_employee_id_fkey,
        ADD CONSTRAINT leaves_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'partner_approved_by') THEN
        ALTER TABLE public.leaves
        DROP CONSTRAINT IF EXISTS leaves_partner_approved_by_fkey,
        ADD CONSTRAINT leaves_partner_approved_by_fkey
        FOREIGN KEY (partner_approved_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'cancelled_by') THEN
        ALTER TABLE public.leaves
        DROP CONSTRAINT IF EXISTS leaves_cancelled_by_fkey,
        ADD CONSTRAINT leaves_cancelled_by_fkey
        FOREIGN KEY (cancelled_by)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;
END $$;
