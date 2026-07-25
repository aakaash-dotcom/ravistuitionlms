/*
# Ravi's Tuition Centre Portal - Full Schema

## Overview
Creates the complete schema for a tuition centre management portal with three roles:
Admin (Ravi), Parents, and Students. Single-tenant app (one tuition centre),
no Supabase Auth sign-in screen — login is handled via custom lookup against
the students/users tables using the anon key. Therefore all policies use
TO anon, authenticated so the anon-key frontend can read/write its own data.

## Tables
1. users — admin accounts (phone + password)
2. students — student records (rollNo, password, parent phone, class, stream, fees, photo)
3. attendance — daily attendance per student
4. test_reports — weekly/monthly marks per student per subject (grid entry)
5. daily_tests — MCQ quiz attempt results
6. mcq_quizzes — quiz definitions
7. mcq_questions — questions belonging to a quiz
8. diary_entries — study diary entries (admin creates, parent/student read)
9. notices — announcements
10. study_materials — downloadable resources
11. banners — homepage banners
12. fees — payment transactions

## Security
RLS enabled on every table. Policies allow anon+authenticated full CRUD because
this is a single-tenant app with custom login (no Supabase Auth session). The
anon key is the app's only credential and must be able to operate all tables.
*/

-- 1. users (admin)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL DEFAULT 'Admin',
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- 2. students
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no text UNIQUE NOT NULL,
  name text NOT NULL,
  password text NOT NULL,
  class text NOT NULL,
  board text NOT NULL DEFAULT 'State',
  stream text,
  commerce_elective text,
  school text,
  phone text,
  parent_name text,
  parent_phone text,
  photo_url text,
  total_fee numeric NOT NULL DEFAULT 0,
  fee_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- 3. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'Present',
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

-- 5. daily_tests (MCQ quiz attempts) — created before mcq_quizzes FK reference
CREATE TABLE IF NOT EXISTS daily_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quiz_id uuid,
  subject text,
  score numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 100,
  percentage numeric NOT NULL DEFAULT 0,
  answers jsonb,
  created_at timestamptz DEFAULT now()
);

-- 6. mcq_quizzes
CREATE TABLE IF NOT EXISTS mcq_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  topic text,
  subject text NOT NULL,
  class text NOT NULL,
  stream text,
  total_marks numeric NOT NULL DEFAULT 100,
  duration integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. mcq_questions
CREATE TABLE IF NOT EXISTS mcq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES mcq_quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  answer text NOT NULL,
  marks numeric NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 4. test_reports (weekly/monthly marks grid)
CREATE TABLE IF NOT EXISTS test_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  marks numeric NOT NULL DEFAULT 0,
  out_of numeric NOT NULL DEFAULT 100,
  test_type text NOT NULL DEFAULT 'Weekly',
  week text,
  month text,
  test_date date NOT NULL DEFAULT CURRENT_DATE,
  remark text,
  created_at timestamptz DEFAULT now()
);

-- 8. diary_entries
CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Approved',
  created_at timestamptz DEFAULT now()
);

-- 9. notices
CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  file_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 10. study_materials
CREATE TABLE IF NOT EXISTS study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'textbook',
  subject text,
  class text,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. banners
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  audience text NOT NULL DEFAULT 'Everyone',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 12. fees (payment transactions)
CREATE TABLE IF NOT EXISTS fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'Cash',
  receipt_no text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  remark text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_test_reports_student ON test_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_tests_student ON daily_tests(student_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_quiz ON mcq_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_diary_student ON diary_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

-- users policies
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- students policies
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- attendance policies
DROP POLICY IF EXISTS "anon_select_attendance" ON attendance;
CREATE POLICY "anon_select_attendance" ON attendance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_attendance" ON attendance;
CREATE POLICY "anon_insert_attendance" ON attendance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_attendance" ON attendance;
CREATE POLICY "anon_update_attendance" ON attendance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_attendance" ON attendance;
CREATE POLICY "anon_delete_attendance" ON attendance FOR DELETE TO anon, authenticated USING (true);

-- test_reports policies
DROP POLICY IF EXISTS "anon_select_test_reports" ON test_reports;
CREATE POLICY "anon_select_test_reports" ON test_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_test_reports" ON test_reports;
CREATE POLICY "anon_insert_test_reports" ON test_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_test_reports" ON test_reports;
CREATE POLICY "anon_update_test_reports" ON test_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_test_reports" ON test_reports;
CREATE POLICY "anon_delete_test_reports" ON test_reports FOR DELETE TO anon, authenticated USING (true);

-- daily_tests policies
DROP POLICY IF EXISTS "anon_select_daily_tests" ON daily_tests;
CREATE POLICY "anon_select_daily_tests" ON daily_tests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_daily_tests" ON daily_tests;
CREATE POLICY "anon_insert_daily_tests" ON daily_tests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_daily_tests" ON daily_tests;
CREATE POLICY "anon_update_daily_tests" ON daily_tests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_daily_tests" ON daily_tests;
CREATE POLICY "anon_delete_daily_tests" ON daily_tests FOR DELETE TO anon, authenticated USING (true);

-- mcq_quizzes policies
DROP POLICY IF EXISTS "anon_select_mcq_quizzes" ON mcq_quizzes;
CREATE POLICY "anon_select_mcq_quizzes" ON mcq_quizzes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mcq_quizzes" ON mcq_quizzes;
CREATE POLICY "anon_insert_mcq_quizzes" ON mcq_quizzes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_mcq_quizzes" ON mcq_quizzes;
CREATE POLICY "anon_update_mcq_quizzes" ON mcq_quizzes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mcq_quizzes" ON mcq_quizzes;
CREATE POLICY "anon_delete_mcq_quizzes" ON mcq_quizzes FOR DELETE TO anon, authenticated USING (true);

-- mcq_questions policies
DROP POLICY IF EXISTS "anon_select_mcq_questions" ON mcq_questions;
CREATE POLICY "anon_select_mcq_questions" ON mcq_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_mcq_questions" ON mcq_questions;
CREATE POLICY "anon_insert_mcq_questions" ON mcq_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_mcq_questions" ON mcq_questions;
CREATE POLICY "anon_update_mcq_questions" ON mcq_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_mcq_questions" ON mcq_questions;
CREATE POLICY "anon_delete_mcq_questions" ON mcq_questions FOR DELETE TO anon, authenticated USING (true);

-- diary_entries policies
DROP POLICY IF EXISTS "anon_select_diary_entries" ON diary_entries;
CREATE POLICY "anon_select_diary_entries" ON diary_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_diary_entries" ON diary_entries;
CREATE POLICY "anon_insert_diary_entries" ON diary_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_diary_entries" ON diary_entries;
CREATE POLICY "anon_update_diary_entries" ON diary_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_diary_entries" ON diary_entries;
CREATE POLICY "anon_delete_diary_entries" ON diary_entries FOR DELETE TO anon, authenticated USING (true);

-- notices policies
DROP POLICY IF EXISTS "anon_select_notices" ON notices;
CREATE POLICY "anon_select_notices" ON notices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notices" ON notices;
CREATE POLICY "anon_insert_notices" ON notices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notices" ON notices;
CREATE POLICY "anon_update_notices" ON notices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notices" ON notices;
CREATE POLICY "anon_delete_notices" ON notices FOR DELETE TO anon, authenticated USING (true);

-- study_materials policies
DROP POLICY IF EXISTS "anon_select_study_materials" ON study_materials;
CREATE POLICY "anon_select_study_materials" ON study_materials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_study_materials" ON study_materials;
CREATE POLICY "anon_insert_study_materials" ON study_materials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_study_materials" ON study_materials;
CREATE POLICY "anon_update_study_materials" ON study_materials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_study_materials" ON study_materials;
CREATE POLICY "anon_delete_study_materials" ON study_materials FOR DELETE TO anon, authenticated USING (true);

-- banners policies
DROP POLICY IF EXISTS "anon_select_banners" ON banners;
CREATE POLICY "anon_select_banners" ON banners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_banners" ON banners;
CREATE POLICY "anon_insert_banners" ON banners FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_banners" ON banners;
CREATE POLICY "anon_update_banners" ON banners FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_banners" ON banners;
CREATE POLICY "anon_delete_banners" ON banners FOR DELETE TO anon, authenticated USING (true);

-- fees policies
DROP POLICY IF EXISTS "anon_select_fees" ON fees;
CREATE POLICY "anon_select_fees" ON fees FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fees" ON fees;
CREATE POLICY "anon_insert_fees" ON fees FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fees" ON fees;
CREATE POLICY "anon_update_fees" ON fees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fees" ON fees;
CREATE POLICY "anon_delete_fees" ON fees FOR DELETE TO anon, authenticated USING (true);