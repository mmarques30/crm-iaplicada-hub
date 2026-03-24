

## Funil de Vendas como Gráfico de Barras Vertical + Fix Build Errors

### Correções

#### 1. Fix TS error em `src/pages/Index.tsx` (linha 183)
O `.map(([name, data])` infere `data` como `unknown`. Adicionar type assertion:
```tsx
.map(([name, data]: [string, { leads: number; won: number; revenue: number }]) => ({
```

#### 2. Substituir funil horizontal por BarChart vertical (linhas 282-333)
Trocar a visualização atual (lista com Progress bars horizontais) por um `BarChart` vertical do Recharts, mostrando cada estágio como uma barra com a quantidade de deals.

- Importar `BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell` de `recharts`
- Importar `ChartContainer, ChartTooltip, ChartTooltipContent` de `@/components/ui/chart`
- Cada barra representa um estágio, com altura proporcional ao `deal_count`
- Cor primária da marca (`#9EB038`) com gradiente para barras
- Tooltip mostrando: nome do estágio, quantidade de deals, valor total, % conversão
- Labels no eixo X com nomes dos estágios

### Arquivo modificado
| Arquivo | Alteração |
|---|---|
| `src/pages/Index.tsx` | Fix type assertion linha 183 + substituir funil por BarChart vertical |

