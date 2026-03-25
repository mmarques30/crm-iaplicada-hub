

## Plano: Redesign das Abas Fontes e Produtos no CRM Analytics

### Referência
As screenshots mostram um layout mais rico e correlacionado: tabela cruzada Produto × Estágio, cards de resumo por produto com win rate e principal fonte, gráfico de contatos por fonte com taxas de conversão Lead→Opp e Opp→Customer, e cards de canal com breakdown de Opportunities/Customers/Deals.

### Mudanças em `src/pages/CrmAnalytics.tsx`

#### 1. Aba Fontes — Layout Completo

**Substituir** o card único "Deals por Canal de Origem" por um layout em 3 seções:

- **Grid 2 colunas**:
  - **Contatos por Fonte de Aquisição** — BarChart horizontal (já existe, manter) com contatos por `canal_origem`
  - **Taxa de Conversão por Fonte** — BarChart horizontal agrupado com 2 métricas por fonte: Lead→Opportunity (%) e Opportunity→Customer (%), calculadas a partir dos deals por canal e seus status (`is_won`, `stage_name`)

- **Cards de canal** (grid 5 colunas, responsivo): para cada fonte, um card com:
  - Dot colorido + nome da fonte
  - Número grande de contatos
  - Mini-tabela: Opportunities, Customers, Deals (contagens)
  
- **Novo query**: buscar `deals_full` com `canal_origem, stage_name, is_won` para calcular conversões por fonte

#### 2. Aba Produtos — Layout Completo

**Substituir** o layout atual (progress bars + BarChart) por 2 seções:

- **Tabela cruzada "Deals por Produto × Estágio do Funil"**:
  - Linhas: estágios do funil (Novo Lead, Contato Iniciado, Qualificado, Proposta, Agendado, Fechado Ganho, Fechado Perdido)
  - Colunas: um por produto (Academy, Business) + Total
  - Valores em badges circulares coloridos por produto
  - Buscar `stage_conversion` que já tem produto + estágio + deal_count

- **Cards de resumo por produto** (grid de 2 colunas):
  - Borda lateral colorida (roxo Academy, laranja Business)
  - Badge com inicial + nome
  - Grid 2x2: Total Deals, Ativos, Win Rate, Perdidos
  - Rodapé: "Principal fonte: X (Y%)" — calculado dos deals por canal filtrado por produto

#### 3. Dados Adicionais Necessários

- **Novo query `deals_full_detailed`**: buscar `canal_origem, product (via pipeline), stage_name, is_won` para cruzamentos
  - Permite: deals por produto × estágio, conversão por fonte, principal fonte por produto
  - Query: `deals_full` com `canal_origem, stage_name, stage_order, pipeline_name, is_won`

- Reutilizar `stage_conversion` existente para a tabela cruzada (já tem product + stage_name + deal_count)
- Reutilizar `product_metrics` existente para os cards de resumo

#### 4. Evolução Mensal de Contatos (seção extra na aba Fontes)

- **AreaChart empilhado** "Evolução Mensal de Novos Contatos" com uma área por fonte
- Dados: agrupar contatos por `created_at` (mês) e `canal_origem` via deals_full
- Cores consistentes com SOURCE_COLORS

### Arquivos afetados
- `src/pages/CrmAnalytics.tsx` — refatorar abas Fontes e Produtos

