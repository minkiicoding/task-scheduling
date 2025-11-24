CREATE OR REPLACE FUNCTION public.get_email_by_employee_code(_employee_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT email
    FROM public.profiles
    WHERE employee_code = _employee_code
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_employee_code TO anon, authenticated;
