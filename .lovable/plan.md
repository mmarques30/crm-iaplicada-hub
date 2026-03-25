

## Plano: Corrigir overflow de números nos cards

### Problema
Os números nos KPICards e SourceSummaryCards estão extrapolando os limites dos cards:
- KPICard: `text-[28px]` é grande demais para 6 cards numa linha com valores como "R$ 8.462,99"
- SourceSummaryCard: valores como "R$ 8.462,99" e "29.671" se sobrepõem na grid 2×2

### Alterações

#### 1. `src/components/dashboard/KPICard.tsx`
- Reduzir font-size do valor de `text-[28px]` para `text-xl sm:text-2xl` (responsivo)
- Adicionar `overflow-hidden text-ellipsis whitespace-nowrap` no valor para evitar quebra
- Reduzir padding de `p-[18px_20px]` para `p-3 sm:p-[18px_20px]`
- Adicionar `min-w-0` no container para permitir truncamento em flex

#### 2. `src/components/dashboard/SourceSummaryCard.tsx`
- Reduzir font-size do valor de `text-lg` para `text-sm sm:text-base`
- Adicionar `truncate` no valor para evitar sobreposição
- Reduzir label de `text-[10px]` para `text-[9px]` para dar mais espaço

### Arquivos afetados
- `src/components/dashboard/KPICard.tsx`
- `src/components/dashboard/SourceSummaryCard.tsx`

