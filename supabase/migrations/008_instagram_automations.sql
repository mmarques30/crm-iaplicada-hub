-- Instagram Automations: auto-reply to comments and send DMs
-- Tables already exist in production; this migration documents them for fresh installs

CREATE TABLE IF NOT EXISTS public.instagram_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text NOT NULL,
  post_id text,
  keyword text NOT NULL DEFAULT '',
  comment_reply text NOT NULL,
  dm_message text NOT NULL,
  dm_link text,
  is_active boolean NOT NULL DEFAULT true,
  replies_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.instagram_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write instagram_automations"
  ON public.instagram_automations FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.instagram_comment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.instagram_automations(id) ON DELETE CASCADE,
  comment_id text NOT NULL,
  commenter_username text,
  commenter_ig_id text,
  comment_text text,
  replied_at timestamptz DEFAULT now(),
  dm_sent boolean NOT NULL DEFAULT false,
  contact_id uuid REFERENCES public.contacts(id),
  dm_error text
);

ALTER TABLE public.instagram_comment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write instagram_comment_logs"
  ON public.instagram_comment_logs FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ig_poll_state (
  id serial PRIMARY KEY,
  automation_id uuid NOT NULL REFERENCES public.instagram_automations(id) ON DELETE CASCADE,
  post_id text NOT NULL,
  request_id bigint NOT NULL,
  phase text NOT NULL DEFAULT 'fetching',
  created_at timestamptz DEFAULT now()
);

-- RPC to increment replies_count atomically
CREATE OR REPLACE FUNCTION public.increment_replies_count(automation_uuid uuid)
RETURNS void AS $$
  UPDATE public.instagram_automations
  SET replies_count = replies_count + 1,
      updated_at = now()
  WHERE id = automation_uuid;
$$ LANGUAGE sql;

-- RPC to get secret from vault (used by edge functions)
CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
RETURNS text AS $$
  SELECT decrypted_secret
  FROM vault.secrets
  WHERE name = secret_name
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
