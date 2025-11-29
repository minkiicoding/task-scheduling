-- Change assignments and leaves to NOT cascade delete, but SET NULL on employee_id instead
-- This preserves historical data when users are deleted

-- For assignments: Change employee_id reference to SET NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'employee_id') THEN
        ALTER TABLE public.assignments
        DROP CONSTRAINT IF EXISTS assignments_employee_id_fkey,
        ADD CONSTRAINT assignments_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- For leaves: Change employee_id reference to SET NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'employee_id') THEN
        ALTER TABLE public.leaves
        DROP CONSTRAINT IF EXISTS leaves_employee_id_fkey,
        ADD CONSTRAINT leaves_employee_id_fkey
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;
