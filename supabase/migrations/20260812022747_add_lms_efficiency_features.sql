-- Add parent verification, chapter/part hierarchy, bilingual MCQ, PYQ flags, material progress

-- 1. diary_entries: parent verification
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS parent_verified boolean NOT NULL DEFAULT false;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS parent_verified_at timestamptz;

-- 2. study_materials: chapter/part hierarchy + 3 URLs + PYQ flag
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS stream text;
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS chapter text;
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS part text;
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS ppt_url text;
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS is_pyq boolean NOT NULL DEFAULT false;

-- file_url is already NOT NULL; make it nullable since parts may have only video/ppt
ALTER TABLE study_materials ALTER COLUMN file_url DROP NOT NULL;

-- 3. mcq_quizzes: bilingual + PYQ
ALTER TABLE mcq_quizzes ADD COLUMN IF NOT EXISTS title_ta text;
ALTER TABLE mcq_quizzes ADD COLUMN IF NOT EXISTS topic_ta text;
ALTER TABLE mcq_quizzes ADD COLUMN IF NOT EXISTS is_pyq boolean NOT NULL DEFAULT false;

-- 4. mcq_questions: bilingual
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS question_text_ta text;
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS option_a_ta text;
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS option_b_ta text;
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS option_c_ta text;
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS option_d_ta text;

-- 5. material_progress: student revision checklist
CREATE TABLE IF NOT EXISTS material_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  revised boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, material_id)
);

ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_material_progress" ON material_progress;
CREATE POLICY "anon_select_material_progress" ON material_progress FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_material_progress" ON material_progress;
CREATE POLICY "anon_insert_material_progress" ON material_progress FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_material_progress" ON material_progress;
CREATE POLICY "anon_delete_material_progress" ON material_progress FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_material_progress_student ON material_progress(student_id);
