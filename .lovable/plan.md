

## Plano: Cards de canal em linha única

### Problema
Os cards de canal (Tráfego Direto, Facebook Ads, Instagram Orgânico, etc.) na aba "Funil" quebram em múltiplas linhas quando há mais de 5 fontes.

### Alteração em `src/pages/CrmAnalytics.tsx` (linha 278)

Trocar o grid fixo por um layout de scroll horizontal com cards menores:

- Substituir `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` por `flex overflow-x-auto gap-3 pb-2`
- Adicionar `min-w-[160px] flex-shrink-0` em cada card para que caibam todos em uma linha com scroll se necessário
- Reduzir padding do card de `p-4` para `p-3` e o número grande de `text-2xl` para `text-xl` para compactar

Todos os cards ficarão visíveis em uma única linha horizontal, com scroll suave caso ultrapassem a largura da tela.

### Arquivo afetado
- `src/pages/CrmAnalytics.tsx`

