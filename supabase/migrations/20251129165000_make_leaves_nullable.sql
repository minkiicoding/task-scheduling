-- Make leaves.employee_id nullable to preserve data when user is deleted
ALTER TABLE public.leaves
ALTER COLUMN employee_id DROP NOT NULL;

-- Update the constraint to SET NULL
ALTER TABLE public.leaves
DROP CONSTRAINT IF EXISTS leaves_employee_id_fkey,
ADD CONSTRAINT leaves_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
