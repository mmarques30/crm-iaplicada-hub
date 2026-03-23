

## Corrigir Filtros de Insights + Sistema de Tarefas de Receita

### 1. Corrigir filtros do InsightsTable
**Arquivo:** `src/components/dashboard/InsightsTable.tsx`

Os filtros atuais usam botões inline que podem não estar respondendo corretamente. Substituir por 3 componentes `Select` (lista suspensa) usando o componente existente `src/components/ui/select.tsx`:
- **Produto:** Todos, Academy, Business, Skills, Ambos, Geral
- **Prioridade:** Todas, Alta, Média, Baixa
- **Tipo:** Todos, Positivo, Alerta, Oportunidade, Ação

Os selects ficam lado a lado em uma linha acima da lista de insights.

### 2. Atualização semanal (não a cada 5 minutos)
**Arquivo:** `src/hooks/useInsights.ts`

Alterar `staleTime` de 5 minutos para 7 dias (`7 * 24 * 60 * 60 * 1000`), e `gcTime` para 8 dias. Isso evita chamadas desnecessárias à IA.

### 3. Adicionar status aos insights + criar tarefas
**Arquivo:** `src/components/dashboard/InsightsTable.tsx`

Cada insight recebe um seletor de status com 3 opções:
- **Pendente** (default)
- **Em execução** → ao selecionar, cria automaticamente uma tarefa na tabela `receita_tasks`
- **Concluído**

O status é armazenado em `localStorage` por contexto (ex: `insight-status-instagram-0`).

### 4. Tabela `receita_tasks` no banco
**Migration SQL:**
```sql
CREATE TABLE receita_tasks (
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
ALTER TABLE receita_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read/write receita_tasks" ON receita_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
```

### 5. Nova página de Tarefas de Receita
**Arquivo:** `src/pages/ReceitaTasks.tsx`

Página com lista de tarefas criadas a partir dos insights, mostrando:
- Titulo, métrica, produto, prioridade, contexto de origem
- Status (em execução / concluído) com toggle
- Data de criação
- Filtros por produto e status

### 6. Adicionar rota e menu
**Arquivo:** `src/App.tsx` — adicionar rota `/tarefas`
**Arquivo:** `src/components/layout/AppSidebar.tsx` — adicionar item "Tarefas" com ícone `ListTodo` no menu principal

### Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/InsightsTable.tsx` | Filtros como Select + botão de status por insight |
| `src/hooks/useInsights.ts` | staleTime para 7 dias |
| Migration SQL | Criar tabela `receita_tasks` |
| `src/pages/ReceitaTasks.tsx` | Criar página de tarefas |
| `src/App.tsx` | Adicionar rota `/tarefas` |
| `src/components/layout/AppSidebar.tsx` | Adicionar item Tarefas no menu |

