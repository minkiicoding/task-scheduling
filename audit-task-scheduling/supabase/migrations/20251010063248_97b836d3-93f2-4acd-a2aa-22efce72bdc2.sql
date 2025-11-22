-- Add missing job type values to the enum
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'YE';
ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'อื่น ๆ';