-- ====================================================
-- LABSYNk: Supabase Schema Sync Migration
-- Applied: 2026-02-23
-- Safe to re-run (uses IF NOT EXISTS / RENAME idempotency)
-- ====================================================

-- 1. USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR DEFAULT 'test0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER;

-- 2. INVENTORY
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS faulty_quantity INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url VARCHAR;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description VARCHAR;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS college_id INTEGER;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS subject VARCHAR;

-- 3. SCHEDULES
-- Fix data types: time -> timestamp (combining date + time)
-- ALTER TABLE schedules ALTER COLUMN start_time TYPE TIMESTAMP USING (date + start_time);
-- ALTER TABLE schedules ALTER COLUMN end_time TYPE TIMESTAMP USING (date + end_time);
-- Rename: user_id -> booked_by_id
-- ALTER TABLE schedules RENAME COLUMN user_id TO booked_by_id;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS college_id INTEGER;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS subject VARCHAR;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS instructor_name VARCHAR;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS lab_room VARCHAR;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS course_name VARCHAR DEFAULT '';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS batch VARCHAR DEFAULT '';

-- 4. RESOURCE_SUGGESTIONS
-- Rename: requested_by_id -> user_id
-- ALTER TABLE resource_suggestions RENAME COLUMN requested_by_id TO user_id;
-- Rename: resource_name -> tool_name
-- ALTER TABLE resource_suggestions RENAME COLUMN resource_name TO tool_name;
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS url VARCHAR DEFAULT '';
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Pending';
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 5. INVENTORY_REPORTS
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS reported_item_name VARCHAR;
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS category VARCHAR;
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS location VARCHAR;
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS reporter_name VARCHAR;
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Open';
ALTER TABLE inventory_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 6. VLAB_SUBJECTS
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS code VARCHAR;
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS semester INTEGER;
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS default_compiler VARCHAR;
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS lab_manual_url VARCHAR;
ALTER TABLE vlab_subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 7. VLAB_EXPERIMENTS
-- Rename: title -> topic
-- ALTER TABLE vlab_experiments RENAME COLUMN title TO topic;
ALTER TABLE vlab_experiments ADD COLUMN IF NOT EXISTS unit INTEGER;
ALTER TABLE vlab_experiments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE vlab_experiments ADD COLUMN IF NOT EXISTS suggested_simulation VARCHAR;
ALTER TABLE vlab_experiments ADD COLUMN IF NOT EXISTS simulation_links TEXT;
