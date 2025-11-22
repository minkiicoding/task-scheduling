-- Add client_code column to clients table
ALTER TABLE public.clients 
ADD COLUMN client_code text;