
-- 1. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Enums
CREATE TYPE public.app_module AS ENUM (
  'dashboard','pipeline','contacts','comercial','financeiro',
  'analytics','email','forms','tasks','instagram','settings','admin'
);
CREATE TYPE public.module_permission AS ENUM ('view','edit','none');

-- 3. User permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module public.app_module NOT NULL,
  permission public.module_permission NOT NULL DEFAULT 'none',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Security definer: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- 5. Security definer: has_module_access
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module public.app_module, _min_permission public.module_permission DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id
      AND module = _module
      AND (
        (_min_permission = 'view' AND permission IN ('view', 'edit'))
        OR (_min_permission = 'edit' AND permission = 'edit')
      )
  )
  OR public.is_admin(_user_id);
$$;

-- 6. Trigger function: auto-create profile + default permissions on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module public.app_module;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  FOR _module IN SELECT unnest(enum_range(NULL::public.app_module))
  LOOP
    INSERT INTO public.user_permissions (user_id, module, permission)
    VALUES (NEW.id, _module, 'view');
  END LOOP;

  RETURN NEW;
END;
$$;

-- 7. Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. RLS policies for profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 9. RLS policies for user_permissions
CREATE POLICY "Users can read own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
