-- Add Director position to employee_position enum
ALTER TYPE employee_position ADD VALUE IF NOT EXISTS 'Director';

-- Note: Director will be positioned between Senior Manager and Partner in the hierarchy
-- The position hierarchy should be: A1, A2, Semi-Senior, Senior, Supervisor, Assistant Manager, Manager, Senior Manager, Director, Partner, Admin