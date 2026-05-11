-- ============================================================
-- نظام متابعة مشروع مكافحة الحريق — الطائف
-- Supabase PostgreSQL Schema + RLS Policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
          COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. WORKS TABLE — الأعمال
-- ============================================================
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_no TEXT,
  description TEXT,
  location TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  progress NUMERIC DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT DEFAULT 'لم يبدأ' CHECK (status IN ('لم يبدأ', 'جاري التنفيذ', 'منجز', 'متوقف')),
  start_date DATE,
  end_date DATE,
  responsible TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view works" ON works
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert works" ON works
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update works" ON works
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete works" ON works
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 3. VEHICLES TABLE — العربات
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_no TEXT,
  vehicle_type TEXT,
  plate_no TEXT,
  driver_name TEXT,
  status TEXT DEFAULT 'نشط' CHECK (status IN ('نشط', 'في الصيانة', 'متوقف', 'مسحوب')),
  last_maintenance DATE,
  registration_expiry DATE,
  insurance_expiry DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view vehicles" ON vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert vehicles" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update vehicles" ON vehicles
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete vehicles" ON vehicles
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 4. TOOLS TABLE — العدة
-- ============================================================
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name TEXT NOT NULL,
  tool_type TEXT,
  total_qty NUMERIC DEFAULT 0,
  available_qty NUMERIC DEFAULT 0,
  used_qty NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'متاح' CHECK (status IN ('متاح', 'مستخدم', 'في الصيانة', 'تالف')),
  storage_location TEXT,
  received_by TEXT,
  handover_date DATE,
  return_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view tools" ON tools
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert tools" ON tools
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update tools" ON tools
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete tools" ON tools
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 5. WORKERS TABLE — العاملين
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_name TEXT NOT NULL,
  iqama_no TEXT,
  job_title TEXT,
  mobile TEXT,
  nationality TEXT,
  iqama_expiry DATE,
  work_permit_expiry DATE,
  status TEXT DEFAULT 'نشط' CHECK (status IN ('نشط', 'إجازة', 'غائب', 'منقول', 'منتهي')),
  current_location TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view workers" ON workers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert workers" ON workers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update workers" ON workers
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete workers" ON workers
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 6. APPROVALS TABLE — الاعتمادات
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_no TEXT,
  material_name TEXT NOT NULL,
  material_code TEXT,
  manufacturer TEXT,
  supplier TEXT,
  submitted_date DATE,
  status TEXT DEFAULT 'تحت المراجعة' CHECK (status IN ('تحت المراجعة', 'معتمد', 'مرفوض', 'يحتاج تعديل')),
  revision_no TEXT,
  file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view approvals" ON approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert approvals" ON approvals
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update approvals" ON approvals
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete approvals" ON approvals
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Insert default approval materials
INSERT INTO approvals (material_name, material_code, status) VALUES
  ('Fire Pipes', 'MAT-001', 'تحت المراجعة'),
  ('Grooved Couplings and Fittings', 'MAT-002', 'تحت المراجعة'),
  ('Fire Hose Cabinets', 'MAT-003', 'تحت المراجعة'),
  ('Fire Department Connection', 'MAT-004', 'تحت المراجعة'),
  ('Fire Hydrants', 'MAT-005', 'تحت المراجعة'),
  ('Sprinklers', 'MAT-006', 'تحت المراجعة'),
  ('Zone Control Valve', 'MAT-007', 'تحت المراجعة')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. DOCUMENTS TABLE — الورقيات والمستندات
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_name TEXT NOT NULL,
  document_type TEXT,
  document_no TEXT,
  issue_date DATE,
  expiry_date DATE,
  issuer TEXT,
  status TEXT DEFAULT 'ساري' CHECK (status IN ('ساري', 'منتهي', 'قيد التجديد', 'ملغي')),
  file_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view documents" ON documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update documents" ON documents
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete documents" ON documents
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 8. CUSTODY TABLE — العهدة
-- ============================================================
CREATE TABLE IF NOT EXISTS custody (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custody_no TEXT,
  item_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  received_by TEXT,
  job_title TEXT,
  handover_date DATE,
  status TEXT DEFAULT 'في العهدة' CHECK (status IN ('في العهدة', 'مرتجع', 'مفقود', 'تالف')),
  return_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custody ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view custody" ON custody
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert custody" ON custody
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update custody" ON custody
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete custody" ON custody
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 9. INVENTORY TABLE — المخزون
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code TEXT,
  item_name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  current_qty NUMERIC DEFAULT 0,
  min_qty NUMERIC DEFAULT 0,
  received_qty NUMERIC DEFAULT 0,
  issued_qty NUMERIC DEFAULT 0,
  storage_location TEXT,
  supplier TEXT,
  last_update DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view inventory" ON inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert inventory" ON inventory
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update inventory" ON inventory
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete inventory" ON inventory
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 10. INVENTORY MOVEMENTS TABLE — حركة المخزون
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('وارد', 'منصرف', 'مرتجع', 'تالف')),
  quantity NUMERIC NOT NULL,
  movement_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view movements" ON inventory_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert movements" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete movements" ON inventory_movements
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 11. ATTACHMENTS TABLE — المرفقات
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view attachments" ON attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert attachments" ON attachments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete attachments" ON attachments
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- 12. ACTIVITY LOG TABLE — سجل العمليات
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  action_type TEXT NOT NULL,
  section_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view activity log" ON activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated can insert activity log" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_custody_updated_at BEFORE UPDATE ON custody FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STORAGE BUCKET POLICIES
-- ============================================================
-- Run these in Supabase Dashboard > Storage after creating bucket named "project-files"
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Allow admins to upload
-- CREATE POLICY "Admins can upload files" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'project-files' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Allow all authenticated to read
-- CREATE POLICY "Authenticated can read files" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'project-files');

-- Allow admins to delete
-- CREATE POLICY "Admins can delete files" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (bucket_id = 'project-files' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
