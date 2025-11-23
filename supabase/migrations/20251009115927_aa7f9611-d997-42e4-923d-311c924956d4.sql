-- Step 1: Add new role to enum (must be in separate transaction)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';