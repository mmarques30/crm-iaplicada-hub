

## Plano: Filtros no Controle Financeiro + Business Plan Editável com Dados do Anexo

### Resumo

Adicionar filtros avançados (mês, produto, categoria) ao Controle Financeiro, tornar o Business Plan editável com inline editing, e popular a tabela `metas` com os valores projetados do anexo. Também expandir a estrutura do BP para incluir todas as subcategorias da planilha (Ticket Médio, #Vendas, subcategorias de Folha, Impostos, etc.).

### 1. Filtros no Controle Financeiro

**Arquivo:** `src/pages/FinanceiroPainel.tsx`

Adicionar na barra de filtros (ao lado do seletor de período existente):
- **Filtro de mês específico**: Select com os 12 meses para filtrar dados de um mês isolado
- **Filtro de produto**: Select com Business/Skills/Academy/Todos para filtrar receitas por produto
- **Filtro de categoria de despesa**: Select com Folha/Publicidade/Custos/Impostos/Sistemas/Todos

Os filtros aplicam `useMemo` sobre os dados já carregados (`allVendas`, `allDespesas`), recalculando KPIs, tabelas e gráficos reativamente. Afetam as abas Painel Geral e Registros.

### 2. Business Plan Editável

**Arquivo:** `src/pages/FinanceiroPainel.tsx`

- Tornar as células "P" (Projetado) clicáveis com inline editing: ao clicar, transforma em `<Input type="number" />`, ao sair ou Enter salva no banco
- Mutation `upsertMeta` que faz upsert na tabela `metas` (por `ano`, `mes`, `categoria`)
- Botão "Importar Metas" no header do BP (como no anexo) para importar CSV de metas
- Adicionar coluna **Total** no final da tabela com soma dos 12 meses (P e E)
- Adicionar coluna **%** no início com o percentual de cada categoria

### 3. Expandir estrutura do Business Plan

Reestruturar o BP para refletir a planilha do anexo com todas as linhas:

```text
RECEITA GERAL     100%   (soma Business + Skills + Academy)
  BUSINESS         60%
    Ticket Medio          (meta por categoria)
    #Vendas               (meta por categoria)
    #SDRs                 (meta por categoria)
    #Vendedores           (meta por categoria)
  SKILLS           15%
    Ticket Medio
    #Vendas
  ACADEMY          25%
    Ticket Medio
    #Vendas
FOLHA                     (soma sub-items)
  Diretoria
  Marketing
  Vendas
  Comissão (5%)           (calculado: 5% da receita)
  Operações
PUBLICIDADE        10%
CUSTOS                    (soma sub-items)
  Impostos (6%)           (calculado: 6% da receita)
  Sistemas
RESULTADO                 (receita - folha - publicidade - custos)
MARGEM %                  (resultado / receita)
```

Cada linha será uma `categoria` na tabela `metas`. As linhas calculadas (Comissão 5%, Impostos 6%, totais) não são editáveis.

### 4. Popular tabela `metas` com dados do anexo

**Migração SQL** para inserir os valores projetados de 2026:

Valores extraídos do anexo (em milhares):
- **RECEITA GERAL**: 54, 126, 91, 137, 176, 205, 216, 244, 255, 281, 323, 323
- **BUSINESS**: 25, 75, 50, 75, 100, 125, 125, 150, 150, 175, 200, 200
- **Business Ticket Medio**: 25k todos os meses
- **Business #Vendas**: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 10
- **Business #SDRs**: -, -, -, 1, 1, 1, 2, 2, 2, 3, 3, 3
- **Business #Vendedores**: -, -, -, 1, 1, 1, -, 2, 2, 3, 3, 3
- **SKILLS**: 10, 21, 14, 21, 28, 28, 35, 35, 42, 42, 49, 49
- **Skills Ticket Medio**: 3k todos os meses
- **Skills #Vendas**: 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 25, 21
- **ACADEMY**: 19, 30, 27, 41, 48, 52, 56, 59, 63, 64, 74, 74
- **Academy Ticket Medio**: 1k todos os meses
- **Academy #Vendas**: 8, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32
- **FOLHA**: 19, 23, 21, 23, 25, 27, 27, 29, 29, 31, 33, 33
- **Folha Diretoria**: 10k todos os meses
- **Folha Marketing**: 3k todos os meses
- **Folha Comissão**: 3, 6, 5, 7, 9, 10, 11, 12, 13, 14, 16, 16
- **Folha Operações**: 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4
- **PUBLICIDADE**: 5, 13, 9, 14, 18, 20, 22, 24, 25, 28, 32, 32
- **CUSTOS**: 13, 18, 15, 18, 21, 22, 23, 25, 25, 27, 29, 29
- **Custos Impostos**: 3, 8, 5, 8, 11, 12, 13, 15, 15, 17, 19, 19
- **Custos Sistemas**: 10k todos os meses

INSERT com ~300 registros na tabela `metas` via migração SQL.

### 5. Atualizar lógica de cálculo do bpData

O `useMemo` do `bpData` precisa ser reescrito para:
- Ler cada `categoria` individualmente da tabela `metas` (em vez de calcular percentuais fixos)
- Calcular linhas derivadas: Comissão = 5% da receita, Impostos = 6% da receita
- Calcular totais: FOLHA = soma sub-items, CUSTOS = soma sub-items
- Calcular RESULTADO e MARGEM a partir dos totais

### Arquivos afetados
- `supabase/migrations/` -- nova migração para popular `metas` com ~300 registros
- `src/pages/FinanceiroPainel.tsx` -- filtros, BP editável, estrutura expandida, coluna Total
- `src/integrations/supabase/types.ts` -- atualizar tipo da tabela metas se necessário

