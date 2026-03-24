-- Fix RLS policies: allow authenticated users to create/update/delete forms, pipelines, stages

-- forms
CREATE POLICY IF NOT EXISTS "Authenticated users can insert forms" ON forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update forms" ON forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete forms" ON forms FOR DELETE TO authenticated USING (true);

-- form_fields
CREATE POLICY IF NOT EXISTS "Authenticated users can insert form_fields" ON form_fields FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update form_fields" ON form_fields FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete form_fields" ON form_fields FOR DELETE TO authenticated USING (true);

-- pipelines
CREATE POLICY IF NOT EXISTS "Authenticated users can insert pipelines" ON pipelines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update pipelines" ON pipelines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete pipelines" ON pipelines FOR DELETE TO authenticated USING (true);

-- stages
CREATE POLICY IF NOT EXISTS "Authenticated users can insert stages" ON stages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update stages" ON stages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete stages" ON stages FOR DELETE TO authenticated USING (true);

-- Also allow anon for form creation (public form submissions)
CREATE POLICY IF NOT EXISTS "Anon can insert forms" ON forms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anon can insert form_fields" ON form_fields FOR INSERT TO anon WITH CHECK (true);
