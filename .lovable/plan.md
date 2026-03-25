

## Plano: Limpar aba "Funil" — manter apenas o essencial

### Problema
A aba "Funil" contém dados duplicados e em excesso. Ela deveria mostrar apenas:
1. Os 3 cards de fonte Meta (Instagram Orgânico, Facebook/Instagram Ads, Campanhas Meta Ads)
2. O banner "Total Ecossistema Meta/Instagram"
3. A tabela "Deals por Fonte × Estágio do Funil"

Atualmente inclui também gráficos de "Contatos por Fonte", "Taxa de Conversão por Fonte" e "Evolução Mensal" que já existem na aba "Fontes".

### Alterações

#### 1. `src/components/dashboard/FunnelTab.tsx`
- **Remover** as seções de gráficos duplicados (linhas 284-354):
  - "Contatos por Fonte de Aquisição" (bar chart)
  - "Taxa de Conversão por Fonte" (bar chart)
  - "Evolução Mensal de Novos Contatos" (area chart)
- **Remover** os `useMemo` associados: `contactsBySource`, `conversionBySource`, `monthlyEvolution`
- **Manter** apenas: source cards (3 cards Meta), ecosystem banner, e tabela cross-tab "Deals por Fonte × Estágio"

#### 2. `src/pages/CrmAnalytics.tsx`
- **Remover** o card "Pipeline por Estágio" (linhas 166-188) da aba Funil — ele é redundante com os dados do FunnelTab
- Manter apenas `<FunnelTab />` dentro da aba "Funil"

### Resultado
A aba "Funil" ficará com exatamente 3 seções, como nas imagens de referência:
- 3 cards lado a lado (Instagram Orgânico, Facebook/Instagram Ads, Campanhas Meta Ads)
- Banner totalizador do ecossistema Meta
- Tabela Deals por Fonte × Estágio

### Arquivos afetados
- `src/components/dashboard/FunnelTab.tsx`
- `src/pages/CrmAnalytics.tsx`

