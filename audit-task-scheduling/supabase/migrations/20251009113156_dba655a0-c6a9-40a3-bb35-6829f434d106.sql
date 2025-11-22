-- Add new position values to employee_position enum
ALTER TYPE employee_position ADD VALUE IF NOT EXISTS 'Assistant Manager';
ALTER TYPE employee_position ADD VALUE IF NOT EXISTS 'Manager';
ALTER TYPE employee_position ADD VALUE IF NOT EXISTS 'Senior Manager';