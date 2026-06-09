-- ═══════════════════════════════════════════════════════════════════════════
-- NYERI POLYTECHNIC LAN ACCESS CONTROL SYSTEM
-- Supabase Database Schema + Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'staff', 'admin', 'super_admin')),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- ─── FILES TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  uploader_student_id VARCHAR(20),
  category VARCHAR(100) DEFAULT 'general',
  department VARCHAR(100),
  description TEXT,
  is_assignment BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'deleted')),
  download_count INTEGER DEFAULT 0,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_is_shared ON files(is_shared);

-- ─── AUDIT LOGS TABLE (COVERT SYSTEM LOG) ────────────────────────────────────
-- Students have NO access to this table
-- Only admins can query it
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_id VARCHAR(20),
  full_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  target_path TEXT,
  old_path TEXT,
  target_type VARCHAR(20) DEFAULT 'file',
  ip_address INET,
  user_agent TEXT,
  details TEXT,
  file_size BIGINT,
  success BOOLEAN DEFAULT TRUE,
  hostname VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_student_id ON audit_logs(student_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_success ON audit_logs(success);

-- ─── FOLDERS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id),
  department VARCHAR(100),
  category VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY POLICIES ─────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Users: only service role can read/write (backend handles everything)
CREATE POLICY "Service role full access on users"
  ON users FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Files: service role full access
CREATE POLICY "Service role full access on files"
  ON files FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Audit logs: ONLY service role - students/staff cannot even see this table
CREATE POLICY "Service role only on audit_logs"
  ON audit_logs FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Deny all anon/authenticated access to audit_logs (covert logging)
CREATE POLICY "No direct access to audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (FALSE);

-- Folders: service role full access
CREATE POLICY "Service role full access on folders"
  ON folders FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ─── DEFAULT ADMIN ACCOUNT ───────────────────────────────────────────────────
-- Password: Admin@Poly2024 (bcrypt hash)
-- CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN
INSERT INTO users (student_id, full_name, email, password_hash, role, department, is_active)
VALUES (
  'ADMIN001',
  'System Administrator',
  'admin@nyeripolytechnic.ac.ke',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGKBGIqRXxImV3Vb9MOv3hE5pEq',
  'super_admin',
  'ICT',
  TRUE
)
ON CONFLICT (student_id) DO NOTHING;

-- ─── SEED DEPARTMENTS ────────────────────────────────────────────────────────
INSERT INTO folders (name, department, category) VALUES
  ('Past Papers - Plumbing Theory', 'Plumbing', 'past_papers'),
  ('Past Papers - Electrical', 'Electrical', 'past_papers'),
  ('Past Papers - ICT', 'ICT', 'past_papers'),
  ('Past Papers - Carpentry', 'Carpentry', 'past_papers'),
  ('Learning Videos - Plumbing', 'Plumbing', 'videos'),
  ('Learning Videos - Electrical', 'Electrical', 'videos'),
  ('Learning Videos - ICT', 'ICT', 'videos'),
  ('Assignments', NULL, 'assignment')
ON CONFLICT DO NOTHING;

-- ─── TRIGGER: Updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
