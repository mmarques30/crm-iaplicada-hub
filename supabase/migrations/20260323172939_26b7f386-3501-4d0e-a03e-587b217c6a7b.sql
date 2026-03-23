CREATE TABLE public.receita_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  metric text,
  product text,
  priority text,
  source_context text,
  status text NOT NULL DEFAULT 'em_execucao',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.receita_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write receita_tasks" ON public.receita_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);