

## Plano: Renomear "Produtos" para "Origem" e reestruturar

### Resumo
A aba "Produtos" será renomeada para "Origem" e seu conteúdo será substituído pelas seções de produto/origem que já existem no `FunnelTab.tsx` (linhas 469-635). Essas seções serão removidas do FunnelTab para evitar duplicação.

### Alterações

#### 1. `src/pages/CrmAnalytics.tsx`
- Linha 153: mudar `{ v: 'products', l: 'Produtos' }` para `{ v: 'products', l: 'Origem' }`
- Linhas 322-458: substituir todo o conteúdo da `TabsContent value="products"` por `<OrigemTab />`
- Adicionar import do novo componente

#### 2. Criar `src/components/dashboard/OrigemTab.tsx`
Novo componente que extrai as seções de produto do `FunnelTab.tsx` (linhas 226-635):
- **Header "Origem por Produto"**: banner gradiente amarelo com total de contatos e 4 cards de produto (Academy/Business/Skills/Offline) com badges, barras de progresso e descrições
- **Formulários de Conversão**: barras horizontais com badges de produto
- **Fonte de Origem × Produto**: gráfico de barras empilhadas (Academy roxo, Business laranja)
- **Deals por Produto × Estágio**: tabela cruzada com badges circulares coloridos
- **Product Summary Cards**: cards Academy e Business com Total Deals, Ativos, Win Rate, Perdidos, Principal fonte
- **Deals por Fonte × Estágio**: tabela cruzada fonte vs estágio

O componente fará suas próprias queries (contacts, deals_full, stages) — mesma lógica que já existe no FunnelTab.

#### 3. `src/components/dashboard/FunnelTab.tsx`
- Remover linhas 469-635 (seções: "Origem por Produto", "Formulários de Conversão", "Fonte de Origem × Produto", "Deals por Produto × Estágio", "Product Summary Cards")
- Remover variáveis/memos não mais usados: `productData`, `productDescriptions`, `formConversion`, `maxFormCount`, `sourceByProduct`, `dealsByProductStage`, `productSummary`, `PRODUCT_COLORS`
- Manter as seções de fontes Meta/Instagram, ecosystem banner, gráficos de conversão e evolução mensal, e tabela "Deals por Fonte × Estágio"

### Arquivos afetados
- `src/pages/CrmAnalytics.tsx` — renomear aba + importar OrigemTab
- `src/components/dashboard/OrigemTab.tsx` — novo componente
- `src/components/dashboard/FunnelTab.tsx` — remover seções de produto

