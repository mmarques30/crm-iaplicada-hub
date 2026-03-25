

## Fix: Mostrar todos os leads + atualizar dados externos

### Problemas identificados

1. **Tabelas limitadas a 50 linhas** — `CrmAnalytics.tsx` usa `.slice(0, 50)` nas linhas 339 e 493, cortando os leads exibidos. Não há paginação.

2. **Dados externos não atualizam** — Os hooks `usePresencaData` e `useVisitantesData` têm `staleTime: 5min` + `refetchOnWindowFocus: false`. Não existe botão de refresh manual. Os dados ficam cache'd na sessão.

3. **Query de contatos para cruzamento** (linhas 184-186 do hook) não tem `.limit()`, então o Supabase aplica o default de 1000 linhas — OK se há menos de 1000 contatos.

### Solução

**Arquivo 1: `src/pages/CrmAnalytics.tsx`**

- Adicionar estado de paginação para cada tabela de leads (leadsAula e leadsVisitantes)
- Remover `.slice(0, 50)` e substituir por paginação real: `leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)`
- Constante `PAGE_SIZE = 50`
- Adicionar controles de paginação (Anterior/Próximo + "Mostrando X-Y de Z") abaixo de cada tabela
- Adicionar botão "Atualizar dados" no header de cada tab que chama `queryClient.invalidateQueries` para forçar refresh dos dados externos

**Arquivo 2: `src/hooks/useExternalSupabase.ts`**

- Reduzir `staleTime` de `5 * 60_000` para `2 * 60_000` (2 min) nos hooks `usePresencaData` e `useVisitantesData`
- Adicionar `refetchOnMount: 'always'` para garantir que os dados são re-fetched quando o componente monta
- Exportar as `queryKey`s para que o componente possa invalidar manualmente

### Nenhuma query Supabase é alterada. Nenhuma lógica de cruzamento muda.

