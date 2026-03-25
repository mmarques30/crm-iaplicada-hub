

## Plano: Ajustar aba Evolução do Facebook Ads para corresponder ao Manus

### Problema
A aba "Evolução" mostra "Atualize os dados para ver a evolução diária" porque `dailyInsights` está vazio (o dashboard-collector não foi executado recentemente ou não retornou dados diários). A estrutura dos 4 gráficos já existe, mas há diferenças visuais em relação ao Manus.

### Diferenças identificadas (código vs Manus)

1. **Investimento Diário** — fill opacity muito baixo (0.2). Manus mostra preenchimento rosa sólido (~0.5-0.6)
2. **CTR Diário** — título mostra "CTR Diário (%)" mas Manus mostra "CTR Diário". Eixo Y deve formatar como "4%" em vez de apenas número
3. **Resumo Semanal** — barras de gasto devem ser rosa vibrante (`#E8446E`), não o vermelho atual (`#E8684A`). Barras de leads devem ser azul-marinho escuro (`#1E2A3F`)
4. **Impressões e Cliques** — cores devem ser azul para impressões e rosa/vermelho para cliques (já correto), mas a legenda e tooltips precisam ajuste

### Alterações em `src/pages/FacebookAdsPage.tsx`

**a) Investimento Diário (linha ~1047)**
- Mudar `fillOpacity={0.2}` para `fillOpacity={0.4}`
- Cor da área: manter `#E8684A` (rosa avermelhado, bate com Manus)

**b) CTR Diário (linha ~1075)**
- Título: remover "(%)": `"CTR Diário"`
- Eixo Y: adicionar `tickFormatter={v => \`${v}%\`}` e remover `unit="%"`

**c) Resumo Semanal (linha ~1102)**
- Cor das barras de gasto: `#E8446E` (rosa vibrante como no Manus)
- Cor das barras de leads: `#1E2A3F` (azul-marinho escuro)
- Adicionar legenda com marcadores coloridos

### Arquivo afetado
- `src/pages/FacebookAdsPage.tsx` — ajustes visuais nos 4 gráficos da aba Evolução

*Nota: os gráficos mostrarão dados reais quando o dashboard-collector for executado (botão "Atualizar dados" no Painel Geral). A estrutura e layout dos gráficos já correspondem ao Manus.*

