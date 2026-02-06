-- ============================================================================
-- Restrict marketing table RLS to admin-only
-- Previously: any authenticated user could read/write marketing data
-- Now: only users with ADMIN role can access marketing tables
-- ============================================================================

-- Drop all existing marketing policies
DROP POLICY IF EXISTS "Authenticated users can view marketing deliverables" ON public.marketing_deliverables;
DROP POLICY IF EXISTS "Authenticated users can update deliverables" ON public.marketing_deliverables;
DROP POLICY IF EXISTS "Authenticated users can view marketing client inputs" ON public.marketing_client_inputs;
DROP POLICY IF EXISTS "Authenticated users can manage client inputs" ON public.marketing_client_inputs;
DROP POLICY IF EXISTS "Authenticated users can view marketing content calendar" ON public.marketing_content_calendar;
DROP POLICY IF EXISTS "Authenticated users can update calendar items" ON public.marketing_content_calendar;
DROP POLICY IF EXISTS "Authenticated users can view marketing influencers" ON public.marketing_influencers;
DROP POLICY IF EXISTS "Authenticated users can view marketing partnerships" ON public.marketing_partnerships;
DROP POLICY IF EXISTS "Authenticated users can view marketing reports" ON public.marketing_reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.marketing_reports;
DROP POLICY IF EXISTS "Authenticated users can view marketing communications" ON public.marketing_communications;
DROP POLICY IF EXISTS "Authenticated users can manage communications" ON public.marketing_communications;
DROP POLICY IF EXISTS "Authenticated users can view marketing documents" ON public.marketing_documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.marketing_documents;

-- Create admin-only policies for all marketing tables
CREATE POLICY "admin_only" ON public.marketing_deliverables
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_client_inputs
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_content_calendar
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_influencers
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_partnerships
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_reports
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_communications
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only" ON public.marketing_documents
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
