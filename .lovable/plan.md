

## Ajuste: Cards de categoria preencherem o espaço disponível

### Problema
Os cards de categoria (linha 269) usam `grid-cols-6` fixo no breakpoint `lg`, mas quando há apenas 4 categorias, sobram 2 colunas vazias.

### Solução
Mudar o grid de `lg:grid-cols-6` para usar colunas dinâmicas baseadas na quantidade de categorias, com um máximo de 6. Quando há 4 categorias, cada card ocupa 1/4 do espaço.

### Arquivo
`src/pages/InstagramAnalytics.tsx` — linha 269

### Alteração
Trocar:
```
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
```
Por lógica que calcula `lg:grid-cols-{n}` baseado em `Math.min(categoryData.length, 6)`, garantindo que os cards sempre preencham a linha inteira. Usarei classes Tailwind dinâmicas mapeadas para evitar problemas de purge.

