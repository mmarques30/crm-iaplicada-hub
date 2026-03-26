

## Plano: Autenticação + Painel Admin com Permissões Granulares

### Resumo
Criar sistema completo de autenticação (email/senha + Google), proteção de rotas, e painel administrativo para gerenciar usuários e permissões por módulo.

### Modelo de Permissões

Módulos controlados:
- `dashboard`, `pipeline`, `contacts`, `comercial`, `financeiro`, `analytics`, `email`, `forms`, `tasks`, `instagram`, `settings`, `admin`

Cada usuário terá permissões por módulo: `view`, `edit`, ou `none`.

### Migrações SQL

#### 1. Tabela `profiles`
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
-- Trigger para criar profile automaticamente no signup
```

#### 2. Tabela `user_roles` (roles por módulo)
```sql
create type public.app_module as enum (
  'dashboard','pipeline','contacts','comercial','financeiro',
  'analytics','email','forms','tasks','instagram','settings','admin'
);
create type public.module_permission as enum ('view','edit','none');

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  module app_module not null,
  permission module_permission not null default 'none',
  unique(user_id, module)
);
alter table public.user_permissions enable row level security;
```

#### 3. Security definer functions
- `has_module_access(user_id, module, min_permission)` — verifica permissão sem recursão RLS
- `is_admin(user_id)` — verifica se é admin
- Trigger `on_auth_user_created` — cria profile + permissões default (`view` para todos os módulos)

#### 4. RLS policies
- Profiles: usuário lê/edita o próprio; admin lê/edita todos
- Permissions: admin pode CRUD; usuário lê as próprias

### Arquivos novos

#### `src/pages/Auth.tsx`
- Tela de login/signup com email+senha
- Botão "Entrar com Google"
- Toggle entre login e cadastro
- Visual consistente com tema escuro do app
- Redirecionamento pós-login para `/`

#### `src/hooks/useAuth.ts`
- Hook com `user`, `profile`, `permissions`, `loading`, `signIn`, `signUp`, `signOut`, `signInWithGoogle`
- `hasAccess(module, minPermission)` helper
- Listener `onAuthStateChange`

#### `src/contexts/AuthContext.tsx`
- Context provider que envolve toda a app
- Disponibiliza `useAuth` globalmente

#### `src/pages/Admin.tsx`
- Painel administrativo (acessível apenas para admins)
- Lista de usuários com nome, email, data de cadastro
- Para cada usuário: grid de módulos com select (none/view/edit)
- Botão para promover/remover admin
- Busca por nome/email

#### `src/components/auth/ProtectedRoute.tsx`
- Wrapper que verifica autenticação
- Redireciona para `/auth` se não logado
- Opcionalmente verifica permissão de módulo

### Alterações em arquivos existentes

#### `src/App.tsx`
- Envolver com `AuthProvider`
- Rota `/auth` (pública, fora do AppLayout)
- Rota `/admin` dentro do AppLayout + proteção admin
- Todas as rotas do AppLayout protegidas por `ProtectedRoute`

#### `src/components/layout/AppLayout.tsx`
- Substituir avatar fixo "IA" por avatar do usuário logado
- Dropdown com "Perfil", "Admin" (se admin), "Sair"

#### `src/components/layout/AppSidebar.tsx`
- Filtrar itens do menu baseado nas permissões do usuário
- Adicionar item "Admin" visível apenas para admins

### Configuração Google OAuth
O usuário precisará configurar o provider Google no Supabase Dashboard (Authentication > Providers) com Client ID e Secret do Google Cloud Console.

### Fluxo
1. Usuário acessa qualquer rota → redirecionado para `/auth` se não logado
2. Faz login/signup → profile criado automaticamente via trigger
3. Admin acessa `/admin` → gerencia permissões por módulo
4. Sidebar mostra apenas módulos permitidos
5. Primeiro usuário cadastrado deve ser promovido a admin manualmente via SQL ou Supabase Dashboard

### Arquivos afetados
- **Novos**: `src/pages/Auth.tsx`, `src/pages/Admin.tsx`, `src/hooks/useAuth.ts`, `src/contexts/AuthContext.tsx`, `src/components/auth/ProtectedRoute.tsx`
- **Alterados**: `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/AppSidebar.tsx`
- **Migração SQL**: 1 migration com profiles, user_permissions, functions, triggers, RLS

