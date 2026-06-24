-- ============================================================
-- SQL Schema for: نظام حوسبة وأرشفة السجل المخبري اليومي
-- Platform: Supabase (PostgreSQL)
-- Instructions: Paste this in Supabase SQL Editor and run
-- ============================================================

-- 1. Settings Lists (teachers, classes, divisions, lab types)
CREATE TABLE IF NOT EXISTS settings_list (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('teacher', 'class', 'division', 'labtype', 'user')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. School Metadata
CREATE TABLE IF NOT EXISTS school_meta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dir TEXT DEFAULT '',
  name TEXT DEFAULT '',
  tech TEXT DEFAULT '',
  principal TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Passwords
CREATE TABLE IF NOT EXISTS passwords (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'tech', 'teacher')),
  password TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Experiments Store (مخزن الأنشطة والتجارب)
CREATE TABLE IF NOT EXISTS experiments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject TEXT NOT NULL,
  name TEXT NOT NULL,
  tools TEXT DEFAULT '',
  class TEXT DEFAULT '',
  month TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Archive (سجل العمل المخبري)
CREATE TABLE IF NOT EXISTS archive (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date TEXT NOT NULL,
  raw_date TEXT NOT NULL,
  exp_num TEXT DEFAULT '',
  lesson TEXT DEFAULT '',
  cls TEXT DEFAULT '',
  div TEXT DEFAULT '',
  cls_div TEXT DEFAULT '',
  subj TEXT DEFAULT '',
  teacher TEXT DEFAULT '',
  exp_name TEXT DEFAULT '',
  tools TEXT DEFAULT '',
  damaged TEXT DEFAULT 'لا يوجد',
  result TEXT DEFAULT 'تمت بنجاح',
  notes TEXT DEFAULT '-',
  saved_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  from_request BOOLEAN DEFAULT FALSE
);

-- 6. Requests (طلبات المعلمين)
CREATE TABLE IF NOT EXISTS requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date TEXT NOT NULL,
  lesson TEXT DEFAULT '',
  teacher TEXT DEFAULT '',
  cls TEXT DEFAULT '',
  div TEXT DEFAULT '',
  cls_div TEXT DEFAULT '',
  subj TEXT DEFAULT '',
  lab_type TEXT DEFAULT '',
  exp_name TEXT DEFAULT '',
  groups TEXT DEFAULT '—',
  tools TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  saved_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Plan Targets (أهداف الخطة الشهرية)
CREATE TABLE IF NOT EXISTS plan_targets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month TEXT NOT NULL,
  subject TEXT NOT NULL,
  class TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, subject, class)
);

-- 8. Materials (اللوازم المخبرية)
CREATE TABLE IF NOT EXISTS materials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '',
  price REAL DEFAULT 0,
  max_limit REAL DEFAULT 0,
  min_limit REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Transactions (حركات المواد)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mat_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT '',
  doc TEXT DEFAULT '',
  party TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  qty REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Stats Meta
CREATE TABLE IF NOT EXISTS stats_meta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Extend CHECK constraint for existing DBs (adds 'labtype')
ALTER TABLE settings_list DROP CONSTRAINT IF EXISTS settings_list_type_check;
-- Drop old constraint if exists, then add updated one
ALTER TABLE settings_list DROP CONSTRAINT IF EXISTS settings_list_type_check;
ALTER TABLE settings_list ADD CONSTRAINT settings_list_type_check CHECK (type IN ('teacher', 'class', 'division', 'labtype', 'user'));

-- Enable Row Level Security (optional, disable for public app)
-- ============================================================
ALTER TABLE settings_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_meta ENABLE ROW LEVEL SECURITY;

-- Allow public access (no auth required - matches current system)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public select" ON settings_list; DROP POLICY IF EXISTS "Allow public insert" ON settings_list; DROP POLICY IF EXISTS "Allow public update" ON settings_list; DROP POLICY IF EXISTS "Allow public delete" ON settings_list;
  DROP POLICY IF EXISTS "Allow public select" ON school_meta; DROP POLICY IF EXISTS "Allow public insert" ON school_meta; DROP POLICY IF EXISTS "Allow public update" ON school_meta;
  DROP POLICY IF EXISTS "Allow public select" ON passwords; DROP POLICY IF EXISTS "Allow public insert" ON passwords; DROP POLICY IF EXISTS "Allow public update" ON passwords;
  DROP POLICY IF EXISTS "Allow public all" ON experiments; DROP POLICY IF EXISTS "Allow public all" ON archive; DROP POLICY IF EXISTS "Allow public all" ON requests;
  DROP POLICY IF EXISTS "Allow public all" ON plan_targets; DROP POLICY IF EXISTS "Allow public all" ON materials; DROP POLICY IF EXISTS "Allow public all" ON transactions;
  DROP POLICY IF EXISTS "Allow public all" ON stats_meta;
END $$;

CREATE POLICY "Allow public select" ON settings_list FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON settings_list FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON settings_list FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON settings_list FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON school_meta FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON school_meta FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON school_meta FOR UPDATE USING (true);

CREATE POLICY "Allow public select" ON passwords FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON passwords FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON passwords FOR UPDATE USING (true);

CREATE POLICY "Allow public all" ON experiments FOR ALL USING (true);
CREATE POLICY "Allow public all" ON archive FOR ALL USING (true);
CREATE POLICY "Allow public all" ON requests FOR ALL USING (true);
CREATE POLICY "Allow public all" ON plan_targets FOR ALL USING (true);
CREATE POLICY "Allow public all" ON materials FOR ALL USING (true);
CREATE POLICY "Allow public all" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow public all" ON stats_meta FOR ALL USING (true);

-- ============================================================
-- 11. Audit Log (سجل التدقيق) - Optional
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  time TIMESTAMPTZ DEFAULT NOW(),
  user TEXT DEFAULT '',
  action TEXT DEFAULT '',
  details TEXT DEFAULT ''
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all" ON audit_log;
CREATE POLICY "Allow public all" ON audit_log FOR ALL USING (true);
