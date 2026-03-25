

## Plano: Corrigir cards de Origem para mostrar canal de origem real

### Problema
Os cards principais da aba "Origem" estão agrupando contatos por `produto_interesse` (Academy/Business/Skills/Offline), não por canal de origem (`utm_source`/`fonte_registro`). Contatos sem `produto_interesse` caem todos em "Offline/Importados", criando a impressão de que tudo é "Offline".

### Causa raiz
O `productData` no `OrigemTab.tsx` (linhas 61-72) classifica contatos pelo campo `produto_interesse`, não pelo campo de origem. O nome "Origem" sugere canal de aquisição, mas o código mostra distribuição por produto.

### Alteração em `src/components/dashboard/OrigemTab.tsx`

**Substituir os 4 cards de produto pelos cards de canal de origem:**

1. Trocar o cálculo `productData` (linhas 61-72) por um que agrupe contatos usando `normalizeChannel(c.utm_source || c.fonte_registro)`, gerando contagens por canal: "Facebook Ads", "Instagram Orgânico", "Tráfego Direto", "WhatsApp", "Formulário / Orgânico", "Não rastreado", etc.

2. Atualizar `PRODUCT_COLORS` para `CHANNEL_COLORS` com cores por canal:
   - Facebook Ads → `#4A9FE0` (azul)
   - Instagram Orgânico → `#E8684A` (coral)
   - Tráfego Direto → `#AFC040` (verde)
   - WhatsApp → `#2CBBA6` (teal)
   - Formulário / Orgânico → `#E8A43C` (laranja)
   - Não rastreado → `#7A8460` (cinza)

3. Atualizar `productDescriptions` para `channelDescriptions` com descrições por canal.

4. No header, mudar título de "ORIGEM POR PRODUTO" para "ORIGEM POR CANAL".

5. O grid de cards passa a ser dinâmico (mostra todos os canais encontrados), mantendo a mesma estrutura visual (ícone + nome + contagem + barra + % + descrição).

6. As demais seções (Formulários de Conversão, Fonte × Produto, Deals por Produto × Estágio, Product Summary) permanecem iguais — elas já usam dados de produto corretamente.

### Arquivo afetado
- `src/components/dashboard/OrigemTab.tsx`

