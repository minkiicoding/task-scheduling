-- Drop password_reset_requests table and related objects as we're moving to admin-only password reset
DROP TABLE IF EXISTS public.password_reset_requests CASCADE;