DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'dob') THEN
    ALTER TABLE students ADD COLUMN dob date;
  END IF;
END $$;
