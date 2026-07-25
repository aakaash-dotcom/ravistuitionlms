/*
# Add settings table for app toggles

## Overview
Single-tenant key-value settings store. Used for the "student diary entry enabled"
toggle so the admin can decide whether students can submit diary entries from
their own phones, or only via the admin tablet in class.

## Tables
- settings (key text PK, value text)
## Security
RLS enabled, anon+authenticated CRUD (single-tenant, custom login).
*/

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT 'false',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE TO anon, authenticated USING (true);

INSERT INTO settings (key, value) VALUES ('student_diary_enabled', 'false')
ON CONFLICT (key) DO NOTHING;