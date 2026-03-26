
## Plano: corrigir de verdade o gráfico "Previsão Próximos 90 Dias"

### O problema real
O gráfico não está mais com artefato de máscara, mas continua visualmente quebrado porque a **projeção começa só em "Abr"**. Isso deixa:
- a banda roxa “flutuando” separada do ponto atual em **Mar**
- a linha de forecast sem transição natural a partir do valor realizado
- a sensação de que o gráfico está incompleto/desalinhado

Pelo anexo, o erro agora é de **continuidade da série**, não mais de cor/fill.

### O que ajustar

#### 1. `src/pages/Index.tsx` — reconstruir `forecastData`
- Manter os meses históricos (`Jan`, `Fev`, `Mar`) com `actual`
- Adicionar um **ponto de transição em `Mar`** para a projeção:
  - `forecast = actual de Mar`
  - `forecastLow = actual de Mar`
  - `forecastHigh = actual de Mar`
  - `band = 0`
- Depois disso, manter os meses futuros (`Abr`, `Mai`, `Jun`) com forecast normal

Isso faz a projeção nascer do ponto atual, em vez de aparecer solta.

#### 2. Ajustar a renderização do intervalo
- Continuar usando a abordagem correta com `stackId`
- Mas garantir que a banda use o ponto de transição em `Mar`, para formar um cone contínuo a partir do “Hoje”
- Se necessário, trocar `type="monotone"` por `type="linear"` nessa banda/projeção para evitar curvatura artificial entre poucos pontos

#### 3. Manter o que já está certo
- Área amarela de `actual`
- Linha de projeção
- `ReferenceLine` em `Mar`
- Tooltip com rótulos “Realizado” e “Projeção”

### Resultado esperado
O gráfico ficará assim:
- histórico termina em `Mar`
- projeção começa exatamente em `Mar`
- a banda de confiança abre gradualmente a partir desse ponto
- sem bloco roxo “solto” entre `Mar` e `Abr`

### Arquivo afetado
- `src/pages/Index.tsx`
