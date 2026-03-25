

## Plano: Substituir PieChart "Formas de Pagamento" por BarChart Horizontal

### Problema
O gráfico donut com 8 categorias tem labels sobrepostas, cores indistinguíveis e valores pequenos (1, 2) invisíveis.

### Solução
Substituir o `PieChart` (linhas 100-108) por um `BarChart` horizontal com layout vertical, mostrando cada forma de pagamento como uma barra com valor numérico visível.

### Mudanças em `src/pages/Financeiro.tsx`

1. **Adicionar mapeamento de labels amigáveis** (constante no topo):
   - `pix_avista` → `Pix à Vista`
   - `entrada_boleto` → `Entrada + Boleto`
   - `cartao_avista` → `Cartão à Vista`
   - `parcelado_cartao` → `Parcelado Cartão`
   - `parcelado_boleto` → `Parcelado Boleto`
   - `parcelado_pix` → `Parcelado Pix`
   - `entrada_cartao` → `Entrada + Cartão`

2. **Substituir PieChart por BarChart horizontal** (linhas 100-108):
   - `BarChart layout="vertical"` com `XAxis type="number"` e `YAxis type="category" width={130}`
   - Labels formatados via o mapeamento acima no `YAxis`
   - Cada barra com `<Cell>` colorido usando `PAY_COLORS`
   - Label numérico na barra via `<Bar label={{ position: 'right', fill: '#E8EDD8', fontSize: 12 }}`
   - Altura do container: `320px` para acomodar todas as barras
   - Ordenar `paymentData` por valor descendente para melhor leitura

3. **Remover imports não utilizados**: `PieChart`, `Pie` (se não usados em outro lugar do arquivo)

