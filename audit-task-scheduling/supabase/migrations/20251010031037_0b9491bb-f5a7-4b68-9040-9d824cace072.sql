-- Create password reset requests table
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own reset requests
CREATE POLICY "Users can view own reset requests"
ON public.password_reset_requests
FOR SELECT
USING (employee_id = auth.uid());

-- Users can create their own reset requests
CREATE POLICY "Users can create own reset requests"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (employee_id = auth.uid());

-- Admins can view all reset requests
CREATE POLICY "Admins can view all reset requests"
ON public.password_reset_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update reset requests
CREATE POLICY "Admins can update reset requests"
ON public.password_reset_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_password_reset_requests_updated_at
BEFORE UPDATE ON public.password_reset_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_employee_id ON public.password_reset_requests(employee_id);