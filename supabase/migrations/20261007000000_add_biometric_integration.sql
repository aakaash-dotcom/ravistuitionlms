/*
# Biometric Attendance Integration — jiSECURE XS200

## Overview
Adds biometric punch tracking, device-to-student mapping, and session-aware
attendance with entry/exit times. Supports real-time WhatsApp notifications
on exit punches and scheduled absent messages.

## New Tables
1. biometric_devices — registered biometric device metadata
2. biometric_punches — raw punch logs from the device (entry + exit)
3. biometric_student_map — maps device User ID → student in the system

## Modified Tables
- attendance — adds entry_time, exit_time, punch_source columns
*/

-- 1. Biometric devices registry
CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial text UNIQUE NOT NULL,          -- jiSECURE device serial number
  device_name text NOT NULL DEFAULT 'XS200',
  location text,                                -- e.g. 'Main Gate', 'Room 1'
  api_key text,                                 -- SmartOffice API key
  api_url text DEFAULT 'http://122.166.44.18:82/api/v2/WebAPI',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Raw biometric punch logs
CREATE TABLE IF NOT EXISTS biometric_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial text NOT NULL,                  -- which device
  device_user_id text NOT NULL,                 -- User ID on the biometric device
  punch_time timestamptz NOT NULL,              -- when the punch happened
  punch_direction text DEFAULT 'in',            -- 'in' or 'out'
  verify_mode text DEFAULT 'fingerprint',       -- fingerprint, face, card, password
  processed boolean NOT NULL DEFAULT false,     -- has this been mapped to attendance?
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Device User ID → Student mapping
CREATE TABLE IF NOT EXISTS biometric_student_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_serial text NOT NULL,
  device_user_id text NOT NULL,                 -- the ID enrolled on the device
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (device_serial, device_user_id)
);

-- Modify attendance table to support entry/exit times
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS entry_time text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_time text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS punch_source text DEFAULT 'manual';
-- punch_source: 'manual' (admin marks), 'biometric' (from device)

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_biometric_punches_device_user
  ON biometric_punches(device_serial, device_user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_punches_time
  ON biometric_punches(punch_time);
CREATE INDEX IF NOT EXISTS idx_biometric_punches_processed
  ON biometric_punches(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_biometric_student_map_device
  ON biometric_student_map(device_serial, device_user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_student_map_student
  ON biometric_student_map(student_id);

-- RLS policies
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_student_map ENABLE ROW LEVEL SECURITY;

-- biometric_devices
DROP POLICY IF EXISTS "anon_select_biometric_devices" ON biometric_devices;
CREATE POLICY "anon_select_biometric_devices" ON biometric_devices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_biometric_devices" ON biometric_devices;
CREATE POLICY "anon_insert_biometric_devices" ON biometric_devices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_biometric_devices" ON biometric_devices;
CREATE POLICY "anon_update_biometric_devices" ON biometric_devices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_biometric_devices" ON biometric_devices;
CREATE POLICY "anon_delete_biometric_devices" ON biometric_devices FOR DELETE TO anon, authenticated USING (true);

-- biometric_punches
DROP POLICY IF EXISTS "anon_select_biometric_punches" ON biometric_punches;
CREATE POLICY "anon_select_biometric_punches" ON biometric_punches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_biometric_punches" ON biometric_punches;
CREATE POLICY "anon_insert_biometric_punches" ON biometric_punches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_biometric_punches" ON biometric_punches;
CREATE POLICY "anon_update_biometric_punches" ON biometric_punches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_biometric_punches" ON biometric_punches;
CREATE POLICY "anon_delete_biometric_punches" ON biometric_punches FOR DELETE TO anon, authenticated USING (true);

-- biometric_student_map
DROP POLICY IF EXISTS "anon_select_biometric_student_map" ON biometric_student_map;
CREATE POLICY "anon_select_biometric_student_map" ON biometric_student_map FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_biometric_student_map" ON biometric_student_map;
CREATE POLICY "anon_insert_biometric_student_map" ON biometric_student_map FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_biometric_student_map" ON biometric_student_map;
CREATE POLICY "anon_update_biometric_student_map" ON biometric_student_map FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_biometric_student_map" ON biometric_student_map;
CREATE POLICY "anon_delete_biometric_student_map" ON biometric_student_map FOR DELETE TO anon, authenticated USING (true);

-- Add setting for biometric auto-absent messages
INSERT INTO settings (key, value) VALUES ('biometric_absent_morning_time', '09:00')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('biometric_absent_evening_time', '21:00')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('biometric_absent_enabled', 'true')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('biometric_whatsapp_on_exit', 'true')
  ON CONFLICT (key) DO NOTHING;