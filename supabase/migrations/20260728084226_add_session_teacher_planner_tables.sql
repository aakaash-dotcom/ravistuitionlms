-- 1) Add session column to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session text DEFAULT 'Morning';

-- 2) Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  password text NOT NULL,
  subjects text[] DEFAULT '{}',
  classes text[] DEFAULT '{}',
  schedule text DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- 3) Teacher attendance
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date text NOT NULL,
  session text DEFAULT 'Morning',
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, date, session)
);

-- 4) Planners
CREATE TABLE IF NOT EXISTS planners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  week_start text NOT NULL,
  day text NOT NULL,
  subject text,
  planned_topic text,
  taught_topic text,
  status text DEFAULT 'Planned',
  created_at timestamptz DEFAULT now()
);

-- 5) Fee display mode setting
INSERT INTO settings (key, value) VALUES ('fee_display_mode', 'full')
  ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE planners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_teachers" ON teachers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "write_teachers" ON teachers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "read_teacher_attendance" ON teacher_attendance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "write_teacher_attendance" ON teacher_attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "read_planners" ON planners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "write_planners" ON planners FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Add stream column to mcq_quizzes if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mcq_quizzes' AND column_name = 'stream') THEN
    ALTER TABLE mcq_quizzes ADD COLUMN stream text;
  END IF;
END $$;

-- Add stream column to study_materials if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_materials' AND column_name = 'stream') THEN
    ALTER TABLE study_materials ADD COLUMN stream text;
  END IF;
END $$;
