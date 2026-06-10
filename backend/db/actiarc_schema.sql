-- actiarc_schema.sql
-- Complete Postgres schema for frontend data model (users, students, events, registrations, notifications, etc.)
-- Run this in pgAdmin (Query Tool) or with psql to create the tables.

-- Drop existing tables (safe if fresh DB)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS student_activities CASCADE;
DROP TABLE IF EXISTS student_details CASCADE;
DROP TABLE IF EXISTS hod_upload_temp CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Departments
CREATE TABLE departments (
  dept_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users: auth records used by frontend/backends (admin, hod, faculty, proctor, student)
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  provider TEXT DEFAULT 'password', -- e.g. password, google, hod_upload
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Students: canonical student table (can link to users.user_id)
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  student_name TEXT,
  student_usn TEXT UNIQUE,
  student_email TEXT,
  semester INTEGER,
  dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- student_details: richer mapping linking user_id -> usn / dept / proctor
CREATE TABLE student_details (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  usn TEXT,
  dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
  semester INTEGER,
  proctor_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Temporary HOD upload table (raw rows from Excel)
CREATE TABLE hod_upload_temp (
  id SERIAL PRIMARY KEY,
  dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
  semester INTEGER,
  proctor_name TEXT,
  proctor_email TEXT,
  student_name TEXT,
  student_usn TEXT,
  student_email TEXT,
  status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Events created by faculty
CREATE TABLE events (
  event_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  dept_id INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  category TEXT DEFAULT 'external', -- external|internal
  payment JSONB DEFAULT '{"amount":0, "options": []}',
  status TEXT DEFAULT 'draft', -- draft|active|cancelled
  hod_status TEXT DEFAULT 'pending', -- pending|approved|rejected
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Registrations: student/user registrations for events
CREATE TABLE registrations (
  registration_id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered', -- registered|cancelled|attended
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  attendance_marked_at TIMESTAMP WITH TIME ZONE,
  attendance_method TEXT
);

-- Notifications for users (HOD approvals, etc.)
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student activities / points (optional table to track approved points)
CREATE TABLE student_activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(event_id) ON DELETE SET NULL,
  points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents uploaded by students (optional)
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(event_id) ON DELETE SET NULL,
  filename TEXT,
  filepath TEXT,
  status TEXT DEFAULT 'pending', -- pending|approved|rejected
  meta JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Useful indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_usn ON students(student_usn);
CREATE INDEX idx_events_dept ON events(dept_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Views to make development easier
CREATE VIEW vw_user_student AS
SELECT u.user_id, u.name, u.email, u.role, s.student_usn, s.student_name, s.student_email, s.semester, s.dept_id
FROM users u
LEFT JOIN students s ON s.user_id = u.user_id;

-- End of schema
