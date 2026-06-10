-- merged_schema_final.sql
-- Unified DB schema (final) for clubverse
-- Includes compatibility tables for controllers: event_categories, activity_docs
-- WARNING: This script DROPS and recreates tables. BACKUP your database before running.

-- === Drop existing tables (reverse order to avoid FK issues) ===
DO $$
BEGIN
  DROP TABLE IF EXISTS role_audit CASCADE;
  DROP TABLE IF EXISTS qr_tokens CASCADE;
  DROP TABLE IF EXISTS semester_reports CASCADE;
  DROP TABLE IF EXISTS student_points_summary CASCADE;
  DROP TABLE IF EXISTS student_activities CASCADE;
  DROP TABLE IF EXISTS activity_points CASCADE;
  DROP TABLE IF EXISTS activity_documents CASCADE;
  DROP TABLE IF EXISTS activity_docs CASCADE;
  DROP TABLE IF EXISTS documents CASCADE;
  DROP TABLE IF EXISTS registrations CASCADE;
  DROP TABLE IF EXISTS event_assignments CASCADE;
  DROP TABLE IF EXISTS event_roles CASCADE;
  DROP TABLE IF EXISTS events CASCADE;
  DROP TABLE IF EXISTS activities CASCADE;
  DROP TABLE IF EXISTS hod_upload_temp CASCADE;
  DROP TABLE IF EXISTS hod_details CASCADE;
  DROP TABLE IF EXISTS proctor_details CASCADE;
  DROP TABLE IF EXISTS faculty_details CASCADE;
  DROP TABLE IF EXISTS student_details CASCADE;
  DROP TABLE IF EXISTS students CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS departments CASCADE;
  DROP TABLE IF EXISTS notifications CASCADE;
  DROP TABLE IF EXISTS audit_logs CASCADE;
  DROP TABLE IF EXISTS event_categories CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Warning while dropping tables: %', SQLERRM;
END $$;


-- =========================
-- 1) Departments
-- =========================
CREATE TABLE departments (
  dept_id     SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  code        VARCHAR(50) UNIQUE
);


-- =========================
-- 2) Users
-- =========================
CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL, -- 'student','faculty','proctor','hod','admin'
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  last_login    TIMESTAMP WITHOUT TIME ZONE,
  firebase_uid  TEXT UNIQUE,
  provider      TEXT DEFAULT 'password'
);


-- =========================
-- 3) Students (light table) and student_details (richer)
-- =========================
CREATE TABLE students (
  id             SERIAL PRIMARY KEY,
  proctor_name   VARCHAR(100),
  proctor_email  VARCHAR(100),
  student_name   VARCHAR(100) NOT NULL,
  student_usn    VARCHAR(50) UNIQUE NOT NULL,
  semester       INT,
  status         VARCHAR(100),
  student_email  VARCHAR(100),
  user_id        INT REFERENCES users(user_id)
);

CREATE TABLE student_details (
  student_id SERIAL PRIMARY KEY,
  user_id    INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  usn        VARCHAR(50) NOT NULL UNIQUE,
  dept_id    INT REFERENCES departments(dept_id),
  semester   INT,
  proctor_id INT REFERENCES users(user_id),
  photo      VARCHAR(255)
);


-- =========================
-- HOD Upload Temp (temporary storage for uploaded proctor-student mappings)
-- =========================
CREATE TABLE hod_upload_temp (
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


-- =========================
-- 4) Faculty & Proctor & HOD details
-- =========================
CREATE TABLE faculty_details (
  faculty_id SERIAL PRIMARY KEY,
  user_id    INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  faculty_usn VARCHAR(50) UNIQUE,
  dept_id    INT REFERENCES departments(dept_id),
  designation VARCHAR(100)
);

CREATE TABLE proctor_details (
  proctor_id SERIAL PRIMARY KEY,
  user_id    INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  dept_id    INT REFERENCES departments(dept_id),
  proctor_usn VARCHAR(50) UNIQUE,
  extra_fields JSONB
);

CREATE TABLE hod_details (
  hod_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  dept_id INT UNIQUE REFERENCES departments(dept_id),
  extra_fields JSONB
);


-- =========================
-- 5) Activities (department-level entries)
-- =========================
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  dept_id INT REFERENCES departments(dept_id),
  created_by INT REFERENCES users(user_id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);


-- =========================
-- 6) Events
-- =========================
CREATE TABLE events (
  event_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  start_at TIMESTAMP WITHOUT TIME ZONE,
  end_at TIMESTAMP WITHOUT TIME ZONE,
  venue VARCHAR(255),
  creator_user_id INT REFERENCES users(user_id),
  dept_id INT REFERENCES departments(dept_id),
  is_external BOOLEAN DEFAULT FALSE,
  payment_amount INT DEFAULT 0,
  payment_options VARCHAR(50)[],
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  hod_status TEXT DEFAULT 'pending',
  hod_remarks TEXT,
  hod_approved_on TIMESTAMP WITHOUT TIME ZONE,
  hod_approved_by INT REFERENCES users(user_id)
);

-- =====================================================
-- Trigger: prevent an event being marked 'active' unless HOD has approved it
-- This enforces at the DB level that only events with hod_status='approved'
-- can have status='active'. Useful as a safety guard in case application
-- logic misses the check.
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_event_active_requires_hod_approval()
RETURNS trigger AS $$
BEGIN
  -- If the new row requests 'active' status, ensure hod_status = 'approved'
  IF (NEW.status IS NOT NULL AND LOWER(NEW.status) = 'active') THEN
    IF (NEW.hod_status IS NULL OR LOWER(NEW.hod_status) <> 'approved') THEN
      RAISE EXCEPTION 'Event cannot be made active until HOD approval is set (hod_status must be ''approved'')';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to events table for INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_ensure_event_active_hod ON events;
CREATE TRIGGER trg_ensure_event_active_hod
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION ensure_event_active_requires_hod_approval();


-- =========================
-- 7) Event roles + assignments + registrations
-- =========================
CREATE TABLE event_roles (
  event_role_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  points_awarded INT NOT NULL
);

CREATE TABLE event_assignments (
  assignment_id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  appointed_by INT REFERENCES users(user_id),
  appointed_start TIMESTAMP WITHOUT TIME ZONE,
  appointed_end TIMESTAMP WITHOUT TIME ZONE,
  remarks TEXT
);

CREATE TABLE registrations (
  registration_id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'registered',
  registered_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  attendance_marked_at TIMESTAMP WITHOUT TIME ZONE,
  attendance_method VARCHAR(50),
  UNIQUE (event_id, user_id)
);


-- =========================
-- 8) Documents & Activity Documents
-- =========================
CREATE TABLE documents (
  document_id SERIAL PRIMARY KEY,
  registration_id INT,
  student_usn VARCHAR(50) REFERENCES students(student_usn),
  file_path TEXT,
  file_name TEXT,
  doc_type TEXT,
  verification_status TEXT DEFAULT 'pending',
  verified_by INT REFERENCES users(user_id),
  verified_at TIMESTAMP WITHOUT TIME ZONE,
  hod_status TEXT DEFAULT 'pending',
  hod_remarks TEXT,
  hod_approved_on TIMESTAMP WITHOUT TIME ZONE,
  hod_approved_by INT REFERENCES users(user_id),
  description TEXT
);

CREATE TABLE activity_documents (
  id SERIAL PRIMARY KEY,
  activity_id INT REFERENCES activities(id),
  student_usn VARCHAR(50) REFERENCES students(student_usn),
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  remarks TEXT
);


-- =========================
-- 9) Activity Points (ledger)
-- =========================
CREATE TABLE activity_points (
  points_id SERIAL PRIMARY KEY,
  student_usn VARCHAR(50) REFERENCES students(student_usn),
  user_id INT REFERENCES users(user_id),
  event_id INT REFERENCES events(event_id),
  points INT NOT NULL,
  category TEXT,
  awarded_by INT REFERENCES users(user_id),
  awarded_at TIMESTAMP WITHOUT TIME ZONE,
  semester INT,
  hod_status TEXT DEFAULT 'pending',
  hod_remarks TEXT,
  hod_approved_by INT REFERENCES users(user_id),
  hod_approved_on TIMESTAMP WITHOUT TIME ZONE,
  dept_id INT REFERENCES departments(dept_id)
);


-- =========================
-- 10) Student Activities (alternate table used by some controllers)
-- =========================
CREATE TABLE student_activities (
  activity_id INT NOT NULL,
  user_id INT REFERENCES users(user_id),
  dept_id INT REFERENCES departments(dept_id),
  description TEXT,
  event_id INT REFERENCES events(event_id),
  points INT,
  status TEXT DEFAULT 'submitted',
  hod_status TEXT DEFAULT 'pending',
  faculty_status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);


-- =========================
-- 11) hod_upload_temp (Excel uploads)
-- =========================
CREATE TABLE hod_upload_temp (
  id SERIAL PRIMARY KEY,
  dept_id INT REFERENCES departments(dept_id),
  semester INT,
  proctor_name TEXT,
  proctor_email TEXT,
  student_name TEXT,
  student_usn VARCHAR(50) REFERENCES students(student_usn),
  student_email TEXT,
  status TEXT,
  uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);


-- =========================
-- 12) Notifications, audit_logs, student_points_summary, semester_reports, role_audit, qr_tokens
-- =========================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  meta JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_points_summary (
  user_id INT PRIMARY KEY REFERENCES users(user_id),
  total_points INT DEFAULT 0,
  approved_points INT DEFAULT 0,
  pending_points INT DEFAULT 0,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE semester_reports (
  report_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  semester INT NOT NULL,
  total_points INT,
  category_breakdown JSONB,
  UNIQUE (user_id, semester)
);

CREATE TABLE role_audit (
  audit_id SERIAL PRIMARY KEY,
  actor_id INT NOT NULL REFERENCES users(user_id),
  target_user_id INT NOT NULL REFERENCES users(user_id),
  action VARCHAR(255) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE qr_tokens (
  token_id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  issued_by INT REFERENCES users(user_id)
);


-- =========================
-- 13) Small helpful indexes
-- =========================
CREATE INDEX idx_students_usn ON students(student_usn);
CREATE INDEX idx_activity_documents_activity_id ON activity_documents(activity_id);
CREATE INDEX idx_activity_points_student_usn ON activity_points(student_usn);
CREATE INDEX idx_documents_student_usn ON documents(student_usn);


-- =========================
-- 14) Compatibility tables (added)
--    These provide compatibility with controllers that reference older names
-- =========================
-- Event categories expected by some controllers
CREATE TABLE IF NOT EXISTS event_categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  max_points INT DEFAULT 0,
  proposed_by INT REFERENCES users(user_id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Controller-friendly activity_docs (maps to activity_documents)
CREATE TABLE IF NOT EXISTS activity_docs (
  doc_id SERIAL PRIMARY KEY,
  activity_id INT REFERENCES activities(id),
  student_usn VARCHAR(50) REFERENCES students(student_usn),
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  verification_status VARCHAR(50) DEFAULT 'pending',
  verified_by INT REFERENCES users(user_id),
  verified_at TIMESTAMP WITHOUT TIME ZONE,
  description TEXT
);

-- Optional: migrate existing rows from activity_documents into activity_docs (one-time)
-- Uncomment and run only if you want to copy data and then keep both tables for compatibility.
-- INSERT INTO activity_docs (activity_id, student_usn, file_path, file_name, mime_type, uploaded_at, verification_status, description)
-- SELECT activity_id, student_usn, file_path, file_name, mime_type, uploaded_at,
--        CASE WHEN verified THEN 'approved' ELSE 'pending' END,
--        remarks
-- FROM activity_documents
-- ON CONFLICT DO NOTHING;


-- =========================
-- 15) Sample data (small set) - useful for manual testing
-- =========================
-- Departments
INSERT INTO departments (name, code) VALUES
  ('Computer Science', 'CSE'),
  ('Information Science', 'ISE')
ON CONFLICT DO NOTHING;

-- Admin user
INSERT INTO users (name, email, password_hash, role, created_at) VALUES
  ('Admin User', 'admin@bmsce.ac.in', '$2b$10$placeholder', 'admin', NOW())
ON CONFLICT (email) DO NOTHING;

-- Faculty
INSERT INTO users (name, email, password_hash, role, created_at) VALUES
  ('Prof. Ananya', 'ananya@bmsce.ac.in', '$2b$10$placeholder', 'faculty', NOW())
ON CONFLICT (email) DO NOTHING;

-- Proctor
INSERT INTO users (name, email, password_hash, role, created_at) VALUES
  ('Dr. Sharma', 'sharma@bmsce.ac.in', '$2b$10$placeholder', 'proctor', NOW())
ON CONFLICT (email) DO NOTHING;

-- HOD
INSERT INTO users (name, email, password_hash, role, created_at) VALUES
  ('Dr. Gupta', 'gupta@bmsce.ac.in', '$2b$10$placeholder', 'hod', NOW())
ON CONFLICT (email) DO NOTHING;

-- Student user and student row
INSERT INTO users (name, email, password_hash, role, created_at) VALUES
  ('Rahul Kumar', 'rahul@bmsce.ac.in', '$2b$10$placeholder', 'student', NOW())
ON CONFLICT (email) DO NOTHING;

-- link student record (student_usn)
INSERT INTO students (proctor_email, student_name, student_usn, semester, status, student_email)
  VALUES ('rajesh@college.edu', 'Rohan', '1BM21CS002', 5, 'inactive', 'rohan@college.edu')
ON CONFLICT (student_usn) DO NOTHING;

-- HOD details (link HOD to CSE dept)
WITH h AS (
  SELECT user_id FROM users WHERE email = 'gupta@bmsce.ac.in' LIMIT 1
), d AS (
  SELECT dept_id FROM departments WHERE code = 'CSE' LIMIT 1
)
INSERT INTO hod_details (user_id, dept_id)
SELECT h.user_id, d.dept_id FROM h CROSS JOIN d
ON CONFLICT DO NOTHING;

-- Events sample
INSERT INTO events (title, description, category, start_at, end_at, venue, creator_user_id, dept_id, status)
SELECT 'Web Development Workshop','Learn modern web development','Technical Workshop',
       NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days','CS Lab', u.user_id, d.dept_id, 'active'
FROM users u, departments d
WHERE u.email = 'ananya@bmsce.ac.in' AND d.code = 'CSE'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Event roles
INSERT INTO event_roles (name, points_awarded) VALUES
  ('Participant', 10), ('Volunteer', 20), ('Coordinator', 30)
ON CONFLICT (name) DO NOTHING;


-- Sample activity points and documents (student_usn must exist)
INSERT INTO activity_points (student_usn, event_id, points, category, semester, hod_status, dept_id)
SELECT s.student_usn, e.event_id, 10, 'Technical', 5, 'approved', e.dept_id
FROM students s, events e
WHERE s.student_usn = '1BM21CS002' AND e.title ILIKE '%Web Development%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Ensure a sample activity exists (controllers insert files referencing activities.id)
-- This creates a sample activity linked to the CSE dept and Prof. Ananya if it doesn't exist.
INSERT INTO activities (title, description, dept_id, created_by, created_at)
SELECT 'Sample Activity', 'Auto-created sample activity for testing', d.dept_id, u.user_id, NOW()
FROM users u, departments d
WHERE u.email = 'ananya@bmsce.ac.in' AND d.code = 'CSE'
  AND NOT EXISTS (
    SELECT 1 FROM activities a WHERE a.title = 'Sample Activity' AND a.dept_id = d.dept_id
  )
LIMIT 1;

-- Sample activity_documents entry: reference the activity id using a SELECT to avoid FK errors
INSERT INTO activity_documents (activity_id, student_usn, file_path, file_name, mime_type, uploaded_at, verified)
SELECT a.id, s.student_usn, 'uploads/student/1BM21CS002/sample.pdf', 'sample.pdf', 'application/pdf', NOW(), FALSE
FROM activities a
JOIN students s ON s.student_usn = '1BM21CS002'
WHERE a.title = 'Sample Activity'
LIMIT 1
ON CONFLICT DO NOTHING;


-- =========================
-- 16) Final notes
-- =========================
-- After running: adjust sequences in case needed (psql usually handles it).
-- If code expects different column names, either add compatibility views or update controllers.
-- If you use Firebase UIDs, populate `users.firebase_uid` with auth UIDs.

-- Optional: Reset sequences (uncomment if needed)
-- SELECT setval(pg_get_serial_sequence('users','user_id'), COALESCE((SELECT MAX(user_id) FROM users),0));
-- SELECT setval(pg_get_serial_sequence('events','event_id'), COALESCE((SELECT MAX(event_id) FROM events),0));

-- Done
