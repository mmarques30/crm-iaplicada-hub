

## Filtros do Dashboard — Diagnóstico e Correção

### Problema
Os botões "Filtros" e "Últimos 30 dias" no header do Dashboard (`/`) são apenas visuais — não possuem `onClick` nem lógica de filtragem. São botões decorativos sem funcionalidade.

### Solução
Implementar filtragem funcional no Dashboard sem alterar queries ou lógica de dados existente. Toda filtragem será client-side sobre os dados já carregados.

### Implementação

**Arquivo: `src/pages/Index.tsx`**

1. **State de filtros** — Adicionar estados:
   - `showFilters: boolean` — toggle do painel
   - `periodFilter: '7d' | '30d' | '90d' | 'all'` — filtro de período
   - `productFilter: string` — filtro por produto (business/academy/all)
   - `qualificationFilter: string` — filtro por qualificação (lead/mql/sql/all)
   - `channelFilter: string` — filtro por canal de origem

2. **Botão "Últimos 30 dias"** — Dropdown com opções: 7 dias, 30 dias, 90 dias, Todo período. Filtra deals e contatos por `created_at`.

3. **Botão "Filtros"** — Toggle de um painel colapsável abaixo do header com:
   - Select "Produto": All / Business / Academy
   - Select "Qualificação": All / Lead / MQL / SQL
   - Select "Canal": All / instagram / whatsapp / site / indicação / evento
   - Botão "Limpar filtros"

4. **Lógica de filtragem** — `useMemo` que filtra `deals` e `contacts` baseado nos filtros ativos. Os dados filtrados alimentam os cálculos de `totals`, `pipelineStages`, `leadSources`, etc. Nenhuma query Supabase é alterada.

5. **Visual do painel** — Mesmo estilo do filtro do Pipeline:
   - `bg-[var(--c-card)]`, border `var(--c-border)`, rounded-lg
   - Selects com `h-8 text-xs`
   - Badge no botão "Filtros" mostrando contagem de filtros ativos

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/pages/Index.tsx` | Adicionar states, onClick handlers, painel de filtros, lógica de filtragem client-side |

Nenhum outro arquivo é modificado. Nenhuma query alterada.

