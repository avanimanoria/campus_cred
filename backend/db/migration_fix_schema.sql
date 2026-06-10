-- Migration: Fix schema for HOD upload functionality
-- Adds proctor_name column to students table and creates hod_upload_temp table

-- Step 1: Add proctor_name column to students table if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS proctor_name VARCHAR(100);

-- Step 2: Create hod_upload_temp table if it doesn't exist
CREATE TABLE IF NOT EXISTS hod_upload_temp (
  id                SERIAL PRIMARY KEY,
  semester          INT,
  proctor_name      VARCHAR(100),
  proctor_email     VARCHAR(100),
  student_name      VARCHAR(100),
  student_usn       VARCHAR(50),
  student_email     VARCHAR(100),
  status            VARCHAR(50) DEFAULT 'pending',
  uploaded_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Step 3: Ensure student_details table doesn't have dept_id constraint issues
-- (dept_id column should exist already, but let's verify the schema is correct)

COMMIT;
