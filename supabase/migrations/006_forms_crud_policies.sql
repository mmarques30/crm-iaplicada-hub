-- Allow authenticated users to manage forms (create, update, delete)
-- The existing policies only allow public SELECT on active forms

-- Authenticated users can read ALL forms (including inactive)
CREATE POLICY "Authenticated users can read all forms" ON forms
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can create forms
CREATE POLICY "Authenticated users can create forms" ON forms
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can update forms
CREATE POLICY "Authenticated users can update forms" ON forms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated users can delete forms
CREATE POLICY "Authenticated users can delete forms" ON forms
  FOR DELETE TO authenticated USING (true);

-- Authenticated users can manage form fields
CREATE POLICY "Authenticated users can create form fields" ON form_fields
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update form fields" ON form_fields
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete form fields" ON form_fields
  FOR DELETE TO authenticated USING (true);

-- Add 'checkbox' and 'number' to field_type check constraint
ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_field_type_check;
ALTER TABLE form_fields ADD CONSTRAINT form_fields_field_type_check
  CHECK (field_type IN ('text', 'email', 'phone', 'select', 'textarea', 'hidden', 'number', 'checkbox'));
