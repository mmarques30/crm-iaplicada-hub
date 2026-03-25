

## Plano: Mover "Funil de Vendas" do Facebook Ads para CrmAnalytics

### Problema
A aba "Funil de Vendas" (componente `FunnelTab`) está dentro da página Facebook Ads (`/analytics/facebook-ads`), mas deveria estar na página **Funil de Vendas** (`/analytics/crm` — `CrmAnalytics.tsx`).

### Alterações

#### 1. `src/pages/FacebookAdsPage.tsx`
- **Remover** o componente `FunnelTab` (linhas 48-415 aprox.) inteiramente do arquivo
- **Remover** a aba "Funil de Vendas" da `TabsList` (remover `{ v: 'funnel', l: 'Funil de Vendas' }` da linha 816)
- **Remover** o `TabsContent value="funnel"` (linhas 1114-1117)
- Remover imports não utilizados após a remoção (`normalizeChannel`, `META_SOURCES`, `SOURCE_COLORS`, `getSourceColor`, etc. — apenas se não usados em outro lugar do arquivo)

#### 2. `src/pages/CrmAnalytics.tsx`
- **Importar** e integrar o conteúdo do `FunnelTab` como uma nova aba dentro do CrmAnalytics
- Adicionar `{ v: 'meta-funnel', l: 'Funil Meta' }` à TabsList (para diferenciar da aba "Funil" já existente que mostra pipeline por estágio)
- Criar o `TabsContent value="meta-funnel"` renderizando o componente `FunnelTab` movido
- Adicionar os imports necessários (`normalizeChannel`, `META_SOURCES`, `SOURCE_COLORS`, etc.)

#### 3. Alternativa mais limpa
Extrair `FunnelTab` para seu próprio arquivo `src/components/dashboard/FunnelTab.tsx`, e importá-lo apenas em `CrmAnalytics.tsx`. Isso mantém os arquivos de página menores.

### Arquivos afetados
- `src/pages/FacebookAdsPage.tsx` — remover FunnelTab e aba
- `src/components/dashboard/FunnelTab.tsx` — novo arquivo com o componente extraído
- `src/pages/CrmAnalytics.tsx` — adicionar nova aba "Funil Meta"

