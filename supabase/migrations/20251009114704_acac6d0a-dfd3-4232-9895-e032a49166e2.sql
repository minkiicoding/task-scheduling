-- Add Admin position to employee_position enum
ALTER TYPE employee_position ADD VALUE IF NOT EXISTS 'Admin';