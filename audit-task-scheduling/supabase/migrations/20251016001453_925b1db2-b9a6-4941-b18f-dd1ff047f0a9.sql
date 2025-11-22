-- Update RLS policies to allow all authenticated users to view calendar items

-- Drop existing policies for leaves viewing
DROP POLICY IF EXISTS "Users can view leaves" ON public.leaves;

-- Create new policy allowing all authenticated users to view leaves
CREATE POLICY "All users can view leaves"
ON public.leaves
FOR SELECT
TO authenticated
USING (true);

-- Drop existing policies for assignments viewing  
DROP POLICY IF EXISTS "Users can view assignments" ON public.assignments;

-- Create new policy allowing all authenticated users to view assignments
CREATE POLICY "All users can view assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (true);