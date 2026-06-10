-- seed_actiarc.sql
-- Seed data for actiarc schema (safe to run multiple times)
-- Usage: psql -h localhost -U postgres -d campus_activity -f seed_actiarc.sql

BEGIN;

-- Departments
INSERT INTO departments (name, short_code)
VALUES
  ('Computer Science', 'CSE') ON CONFLICT (dept_id) DO NOTHING,
  ('Electronics', 'ECE') ON CONFLICT (dept_id) DO NOTHING,
  ('Mechanical', 'ME') ON CONFLICT (dept_id) DO NOTHING;

-- Create admin user
INSERT INTO users (name, email, role, provider)
VALUES ('Admin', 'admin@local', 'admin', 'password')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING user_id;

-- HOD user
INSERT INTO users (name, email, role, provider)
VALUES ('HOD CSE', 'hod.cse@college.local', 'hod', 'google')
ON CONFLICT (email) DO NOTHING;

-- Faculty user
INSERT INTO users (name, email, role, provider)
VALUES ('Prof. Smith', 'prof.smith@college.local', 'faculty', 'google')
ON CONFLICT (email) DO NOTHING;

-- Proctor user
INSERT INTO users (name, email, role, provider)
VALUES ('Proctor A', 'proctor.a@college.local', 'proctor', 'hod_upload')
ON CONFLICT (email) DO NOTHING;

-- Student users from HOD upload (provider = hod_upload)
INSERT INTO users (name, email, role, provider)
VALUES
  ('Alice Student', 'alice.student@college.local', 'student', 'hod_upload'),
  ('Bob Student', 'bob.student@college.local', 'student', 'hod_upload')
ON CONFLICT (email) DO NOTHING;

-- Insert students linked to these users
INSERT INTO students (user_id, student_name, student_usn, student_email, semester, dept_id, status)
SELECT u.user_id, u.name, CASE WHEN u.email LIKE 'alice.%' THEN '1BM23CB001' WHEN u.email LIKE 'bob.%' THEN '1BM23CB002' ELSE NULL END, u.email, 5, d.dept_id, 'active'
FROM users u
CROSS JOIN (SELECT dept_id FROM departments WHERE short_code = 'CSE' LIMIT 1) d
WHERE u.email IN ('alice.student@college.local','bob.student@college.local')
ON CONFLICT (student_usn) DO UPDATE SET student_email = EXCLUDED.student_email;

-- Populate student_details for the two students
INSERT INTO student_details (user_id, usn, dept_id, semester, proctor_id, meta)
SELECT u.user_id,
       CASE WHEN u.email LIKE 'alice.%' THEN '1BM23CB001' WHEN u.email LIKE 'bob.%' THEN '1BM23CB002' ELSE NULL END,
       d.dept_id, 5,
       (SELECT user_id FROM users WHERE email = 'proctor.a@college.local'),
       jsonb_build_object('seeded', true)
FROM users u
CROSS JOIN (SELECT dept_id FROM departments WHERE short_code = 'CSE' LIMIT 1) d
WHERE u.email IN ('alice.student@college.local','bob.student@college.local')
ON CONFLICT (user_id) DO UPDATE SET usn = EXCLUDED.usn, updated_at = now();

-- Add a sample event created by faculty
INSERT INTO events (title, description, venue, start_at, end_at, dept_id, created_by, category, payment, status, hod_status)
VALUES (
  'Tech Talk: Modern Web',
  'An introductory talk about modern web development',
  'Auditorium',
  now() + interval '7 days',
  now() + interval '7 days' + interval '2 hours',
  (SELECT dept_id FROM departments WHERE short_code = 'CSE' LIMIT 1),
  (SELECT user_id FROM users WHERE email = 'prof.smith@college.local' LIMIT 1),
  'internal',
  jsonb_build_object('amount', 0),
  'active',
  'approved'
)
ON CONFLICT DO NOTHING;

-- Register Alice for the event
INSERT INTO registrations (event_id, user_id, status)
SELECT e.event_id, u.user_id, 'registered'
FROM events e, users u
WHERE e.title = 'Tech Talk: Modern Web' AND u.email = 'alice.student@college.local'
ON CONFLICT DO NOTHING;

COMMIT;

-- End of seed file
