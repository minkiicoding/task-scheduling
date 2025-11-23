-- Update System Admin position to Partner (Admin level)
UPDATE profiles 
SET position = 'Partner' 
WHERE employee_code = 'admin';