

## Plano: Melhorar Gráficos e Interface do Analytics

### Problemas identificados

1. **PieChart "Distribuição de Contatos"** (PainelGeral, aba Canais) — ilegível com muitas categorias, labels sobrepostas. Redundante com a tabela que já existe acima.
2. **PieChart "Deals por Produto"** (CrmAnalytics, aba Produtos) — com apenas 2 categorias, pie chart desperdiça espaço.
3. **PieChart "Qualificação dos Leads Quentes"** (CrmAnalytics, aba Leads Aula) — mesma questão, poucas categorias e labels sobrepostas.
4. **Gráficos de Crescimento** (PainelGeral, aba Crescimento) — apenas 1 gráfico solitário de alcance IG. Poderia incluir mais contexto.
5. **Funil Integrado** (PainelGeral) — faltam badges de taxa de conversão entre etapas no rodapé, como mostrado na referência.

### Mudanças

#### 1. PainelGeral — Aba Canais
**Substituir PieChart** por lista de barras de progresso customizadas (como nas imagens de referência):
- Cada canal: nome com dot colorido, contagem à direita, barra de progresso com % dentro
- Total de contatos no rodapé
- Mantém o BarChart "Deals por Canal" ao lado (já funciona bem)

#### 2. PainelGeral — Aba Funil
**Adicionar badges de conversão** entre etapas no rodapé:
- "CLIQUE → LANDING: X%", "CONTATO → LEAD: X%", "LEAD → OPPORTUNITY: X%", etc.
- Cores semânticas: verde (>50%), laranja (10-50%), vermelho (<10%)

#### 3. CrmAnalytics — Aba Produtos
**Substituir PieChart** "Deals por Produto" por barras horizontais com labels inline (nome do produto + count). Manter o BarChart de performance ao lado.

#### 4. CrmAnalytics — Aba Leads Aula
**Substituir PieChart** "Qualificação dos Leads Quentes" por mini-cards ou barras de progresso empilhadas mostrando cada lifecycle stage com count e percentual.

#### 5. PainelGeral — Aba Crescimento
**Expandir** de 1 gráfico para um grid 2x2 com:
- Alcance diário IG (já existe)
- Seguidores IG ao longo do tempo (dailyFollowers, já disponível no snapshot)
- Investimento FB Ads por campanha (dados do snapshot)
- Engajamento IG por dia (likes+comments)

### Arquivos afetados
- `src/pages/PainelGeral.tsx` — canais (progress bars), funil (badges conversão), crescimento (grid 2x2)
- `src/pages/CrmAnalytics.tsx` — produtos (horizontal bars), leads aula (cards em vez de pie)

