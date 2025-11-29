-- Update foreign key constraint to allow deletion of clients
-- Change from CASCADE/RESTRICT to SET NULL to preserve assignment history

ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS assignments_client_id_fkey,
ADD CONSTRAINT assignments_client_id_fkey
FOREIGN KEY (client_id)
REFERENCES public.clients(id)
ON DELETE SET NULL;
