-- ============================================================
-- Migration: إزالة الصلاحيات العامة + RLS صارم + Auth
-- شغّل هذا الملف في Supabase SQL Editor
-- ============================================================

-- 1. حذف كل سياسات الوصول العام
DO $$ DECLARE
  tbl TEXT; pol TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- 2. جدول ربط auth.users → الأدوار المحلية
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'tech', 'teacher')),
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. دالة مساعدة: جلب دور المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.user_profiles WHERE id = auth.uid() $$;

-- 4. Trigger: إنشاء profile تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. سياسات RLS صارمة لكل الجداول
-- ============================================================

-- user_profiles
CREATE POLICY "profile_self" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "profile_admin_select" ON public.user_profiles
  FOR SELECT USING (public.get_my_role() IN ('admin','tech'));

-- settings_list
CREATE POLICY "sl_select" ON public.settings_list FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sl_insert" ON public.settings_list FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "sl_update" ON public.settings_list FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "sl_delete" ON public.settings_list FOR DELETE USING (public.get_my_role() = 'tech');

-- school_meta
CREATE POLICY "sm_select" ON public.school_meta FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "sm_insert" ON public.school_meta FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "sm_update" ON public.school_meta FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "sm_delete" ON public.school_meta FOR DELETE USING (public.get_my_role() = 'tech');

-- passwords
CREATE POLICY "pw_select" ON public.passwords FOR SELECT USING (public.get_my_role() = 'tech');
CREATE POLICY "pw_insert" ON public.passwords FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "pw_update" ON public.passwords FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "pw_delete" ON public.passwords FOR DELETE USING (public.get_my_role() = 'tech');

-- experiments
CREATE POLICY "exp_select" ON public.experiments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "exp_insert" ON public.experiments FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "exp_update" ON public.experiments FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "exp_delete" ON public.experiments FOR DELETE USING (public.get_my_role() = 'tech');

-- archive
CREATE POLICY "arc_select" ON public.archive FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "arc_insert" ON public.archive FOR INSERT WITH CHECK (public.get_my_role() IN ('tech','teacher'));
CREATE POLICY "arc_update" ON public.archive FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "arc_delete" ON public.archive FOR DELETE USING (public.get_my_role() = 'tech');

-- requests
CREATE POLICY "req_select" ON public.requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "req_insert" ON public.requests FOR INSERT WITH CHECK (public.get_my_role() IN ('tech','teacher'));
CREATE POLICY "req_update" ON public.requests FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "req_delete" ON public.requests FOR DELETE USING (public.get_my_role() = 'tech');

-- plan_targets
CREATE POLICY "pt_select" ON public.plan_targets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "pt_insert" ON public.plan_targets FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "pt_update" ON public.plan_targets FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "pt_delete" ON public.plan_targets FOR DELETE USING (public.get_my_role() = 'tech');

-- materials
CREATE POLICY "mat_select" ON public.materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "mat_insert" ON public.materials FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "mat_update" ON public.materials FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "mat_delete" ON public.materials FOR DELETE USING (public.get_my_role() = 'tech');

-- transactions
CREATE POLICY "txn_select" ON public.transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "txn_insert" ON public.transactions FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "txn_update" ON public.transactions FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "txn_delete" ON public.transactions FOR DELETE USING (public.get_my_role() = 'tech');

-- stats_meta
CREATE POLICY "st_select" ON public.stats_meta FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "st_insert" ON public.stats_meta FOR INSERT WITH CHECK (public.get_my_role() = 'tech');
CREATE POLICY "st_update" ON public.stats_meta FOR UPDATE USING (public.get_my_role() = 'tech');
CREATE POLICY "st_delete" ON public.stats_meta FOR DELETE USING (public.get_my_role() = 'tech');

-- audit_log
CREATE POLICY "al_insert" ON public.audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "al_select" ON public.audit_log FOR SELECT USING (public.get_my_role() IN ('tech','admin'));
