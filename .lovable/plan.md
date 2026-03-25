

## Plano: Unificar "Funil" e "Funil Meta" em uma única aba

### Problema
Existem duas abas separadas — "Funil" (pipeline por estágio) e "Funil Meta" (análise de fontes Meta) — que deveriam ser uma única aba "Funil".

### Alterações em `src/pages/CrmAnalytics.tsx`

1. **Remover a aba "Funil Meta"** da TabsList (remover `{ v: 'meta-funnel', l: 'Funil Meta' }`) e seu `TabsContent`.

2. **Integrar o conteúdo do `FunnelTab` dentro da aba "Funil"** existente, abaixo do card "Pipeline por Estágio". A aba ficará com:
   - Card "Pipeline por Estágio" (barras horizontais por stage — já existente)
   - Conteúdo do `FunnelTab` (cards de fontes Meta, gráficos de conversão, etc.) logo abaixo

### Arquivo afetado
- `src/pages/CrmAnalytics.tsx`

