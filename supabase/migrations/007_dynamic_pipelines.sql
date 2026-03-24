-- Allow dynamic pipeline creation by changing product from enum to text
-- This enables users to create custom pipelines beyond business/skills/academy

-- Remove the UNIQUE constraint and change type to TEXT
ALTER TABLE pipelines ALTER COLUMN product TYPE TEXT USING product::TEXT;

-- Also update forms table if it uses the same enum
ALTER TABLE forms ALTER COLUMN product TYPE TEXT USING product::TEXT;

-- Also update deals table if it uses the enum
ALTER TABLE deals ALTER COLUMN product TYPE TEXT USING product::TEXT;

-- Also update email_templates if it uses the enum
ALTER TABLE email_templates ALTER COLUMN product TYPE TEXT USING product::TEXT;

-- Drop the enum type (no longer needed)
DROP TYPE IF EXISTS product_type;

-- Allow authenticated users to create, update, and delete pipelines and stages
CREATE POLICY "Authenticated users can insert pipelines" ON pipelines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pipelines" ON pipelines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete pipelines" ON pipelines FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stages" ON stages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stages" ON stages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete stages" ON stages FOR DELETE TO authenticated USING (true);
