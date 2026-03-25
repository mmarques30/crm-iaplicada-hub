

## Plano: Adicionar seção "Produtos" à aba Funil de Vendas do Facebook Ads

### Problema
A aba "Funil de Vendas" atual mostra apenas análise por **fonte** (source cards, charts, cross-tab por fonte). O Manus mostra adicionalmente uma seção completa de **produtos** com 5 componentes que estão faltando:

1. **"Origem por Produto"** — Banner header com total de contatos + 4 cards de produto (Academy, Business, Skills, Offline/Importados) com contagem, barra de progresso, percentual e descrição
2. **"Formulários de Conversão"** — Lista com barras horizontais mostrando nome do formulário (`first_conversion`), badge de produto e contagem
3. **"Fonte de Origem × Produto"** — BarChart horizontal empilhado (Academy roxo, Business laranja) por fonte normalizada, excluindo Offline
4. **"Deals por Produto × Estágio do Funil"** — Tabela cruzada com estágios nas linhas, produtos nas colunas (badges roxo/laranja), coluna TOTAL
5. **Cards resumo por produto** — 2 cards (Academy, Business) com Total Deals, Ativos, Win Rate, Perdidos e Principal fonte

### Dados disponíveis
- `contacts.produto_interesse` (string[]) — classifica contato por produto
- `contacts.first_conversion` (string) — nome do formulário de conversão
- `deals_full.product` (herdado de pipeline) — produto do deal
- `deals_full.canal_origem` — fonte do deal
- `deals_full.stage_name`, `stage_order`, `is_won`, `motivo_perda`

### Alterações em `src/pages/FacebookAdsPage.tsx`

#### Dentro de FunnelTab, após a seção de charts de fontes e antes da cross-tab de Deals por Fonte:

**a) Classificação de contatos por produto** (`useMemo`):
- Iterar contacts, classificar por `produto_interesse`:
  - Se inclui "academy" → Academy
  - Se inclui "business" → Business
  - Se inclui "skills" → Skills
  - Senão → Offline/Importados
- Contar cada categoria

**b) Banner "Origem por Produto"** + 4 cards:
- Header com fundo gradiente amarelo claro, título "Origem por Produto", subtítulo, total de contatos
- 4 cards em grid: Academy (roxo `#7C5CFC`), Business (laranja `#E8A43C`), Skills (verde `#2CBBA6`), Offline (cinza `#7A8460`)
- Cada card: ícone letra, contagem grande, barra de progresso colorida, percentual, descrição textual

**c) "Formulários de Conversão"**:
- Agrupar contacts por `first_conversion`, contar por produto
- Lista com barra horizontal proporcional, badge de produto, contagem
- Ordenar desc por total

**d) "Fonte de Origem × Produto"**:
- Horizontal stacked BarChart (`layout="vertical"`)
- Agrupar contacts por `normalizeChannel(utm_source)`, split por produto (Academy roxo, Business laranja)
- Excluir "Offline/Importado"
- Legend embaixo

**e) "Deals por Produto × Estágio do Funil"**:
- Tabela cruzada: linhas = estágios (do stages query), colunas = Academy + Business + TOTAL
- Valores em badges circulares coloridos (roxo Academy, laranja Business)
- Incluir "Fechado Ganho" e "Fechado Perdido" como linhas

**f) Cards resumo por produto** (grid-cols-2):
- Para cada produto (Academy, Business): Total Deals, Ativos, Win Rate, Perdidos, Principal fonte (canal_origem mais frequente com %)
- Borda lateral colorida (roxo/laranja)

### Queries adicionais necessárias
Expandir a query de contacts para incluir `produto_interesse` e `first_conversion`:
```ts
const { data } = await supabase.from('contacts').select('id, utm_source, utm_medium, utm_campaign, fonte_registro, lifecycle_stage, created_at, produto_interesse, first_conversion')
```

Expandir a query de deals_full para incluir `product`:
```ts
const { data } = await supabase.from('deals_full').select('canal_origem, stage_name, stage_order, is_won, qualification_status, created_at, motivo_perda, product')
```

### Layout final da aba Funil
```text
[Source Cards (3)]
[Ecosystem Banner]
[Charts: Contatos por Fonte | Taxa Conversão]
[Chart: Evolução Mensal]
[Banner: Origem por Produto + 4 product cards]
[Formulários de Conversão]
[Chart: Fonte × Produto]
[Table: Deals por Produto × Estágio]
[Product Summary Cards (2)]
[Table: Deals por Fonte × Estágio]  (já existente)
```

### Arquivo afetado
- `src/pages/FacebookAdsPage.tsx` — expandir FunnelTab com seção de produtos

