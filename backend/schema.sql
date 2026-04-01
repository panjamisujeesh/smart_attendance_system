-- Smart Attendance System Database Schema

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  student_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Enrollments table
CREATE TABLE course_enrollments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, student_id)
);

-- Sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  session_code VARCHAR(6) UNIQUE NOT NULL,
  title VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_radius DOUBLE PRECISION
);

-- Attendance table
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  ip VARCHAR(45),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'excused')),
  UNIQUE(student_id, session_id)
);

-- ============================================
-- SEED DATA
-- ============================================

-- Password for all users: admin123
-- bcrypt hash: $2a$10$yYLHzedSPhxjD8Oa0AFx6ekAVROasU1KUog3vbAyOOXNx/bfD.gm.

INSERT INTO users (name, email, password, role, student_id) VALUES
('Admin User', 'admin@school.edu', '$2a$10$yYLHzedSPhxjD8Oa0AFx6ekAVROasU1KUog3vbAyOOXNx/bfD.gm.', 'admin', NULL),
('Teacher User', 'teacher@school.edu', '$2a$10$yYLHzedSPhxjD8Oa0AFx6ekAVROasU1KUog3vbAyOOXNx/bfD.gm.', 'teacher', NULL),
('Alice Student', 'alice@school.edu', '$2a$10$yYLHzedSPhxjD8Oa0AFx6ekAVROasU1KUog3vbAyOOXNx/bfD.gm.', 'student', 'STU001'),
('Bob Student', 'bob@school.edu', '$2a$10$yYLHzedSPhxjD8Oa0AFx6ekAVROasU1KUog3vbAyOOXNx/bfD.gm.', 'student', 'STU002');

-- Courses (assigned to teacher, id=2)
INSERT INTO courses (name, code, teacher_id) VALUES
('Introduction to Computer Science', 'CS101', 2),
('Data Structures and Algorithms', 'CS201', 2);

-- Enrollments: both students in CS101, alice in CS201
INSERT INTO course_enrollments (course_id, student_id) VALUES
(1, 3),  -- Alice in CS101
(1, 4),  -- Bob in CS101
(2, 3);  -- Alice in CS201
