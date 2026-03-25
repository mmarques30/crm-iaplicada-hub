

## Plano: Corrigir gráfico "Previsão Próximos 90 Dias"

### Problema
O intervalo de confiança está renderizado de forma quebrada. A técnica atual usa duas `Area` sobrepostas — `forecastHigh` preenchido com roxo e `forecastLow` preenchido com a cor do card (`#121509`) para "recortar" a banda. Isso gera artefatos visuais porque a cor de fundo do mask não casa perfeitamente com o fundo real do card.

### Solução

**Arquivo: `src/pages/Index.tsx`**

1. **Dados**: Adicionar um campo calculado `band` = `forecastHigh - forecastLow` em cada ponto do `forecastData` futuro.

2. **Gráfico**: Substituir as duas Areas (`forecastHigh` + `forecastLow` mask) por um approach de `stackId`:
   - `Area` com `dataKey="forecastLow"` — invisível (fill/stroke = "none"), serve como base do stack
   - `Area` com `dataKey="band"` — preenchida com roxo semitransparente, empilhada sobre `forecastLow` via `stackId="confidence"`
   
   Isso renderiza a banda de confiança corretamente entre os valores low e high sem depender de cor de fundo como máscara.

3. Manter a `Line` de projeção (`forecast`) e a `Area` de realizado (`actual`) inalteradas.

### Arquivo afetado
- `src/pages/Index.tsx` (linhas 504-509 para dados, linhas 1007-1008 para o gráfico)

