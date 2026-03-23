

## Corrigir Badges e Elementos com Cores Light-Mode no Tema Dark

### Problema
As variáveis CSS estão corretas (preto + verde escuro), mas várias páginas usam cores hardcoded de tema claro (`bg-emerald-100 text-emerald-800`, `bg-blue-100 text-blue-800`, etc.) que criam elementos com fundo claro/azulado no tema dark.

### Arquivos e Correções

#### 1. `src/pages/CrmAnalytics.tsx`
- `bg-emerald-100 text-emerald-800` → `bg-emerald-500/15 text-emerald-400`

#### 2. `src/pages/FacebookAdsPage.tsx`
- `bg-blue-100 text-blue-800` → `bg-blue-500/15 text-blue-400`

#### 3. `src/pages/InstagramAnalytics.tsx`
- `bg-pink-100 text-pink-800` → `bg-pink-500/15 text-pink-400`

#### 4. `src/pages/Financeiro.tsx`
- `bg-yellow-100 text-yellow-800` → `bg-yellow-500/15 text-yellow-400`
- `bg-green-100 text-green-800` → `bg-green-500/15 text-green-400`

#### 5. `src/pages/InstagramAutomations.tsx`
- `bg-pink-100` círculo → `bg-pink-500/15`
- `bg-blue-100` círculo → `bg-blue-500/15`
- `bg-purple-100` círculo → `bg-purple-500/15`
- `bg-green-100 text-green-800` badge → `bg-green-500/15 text-green-400`

#### 6. `src/lib/format.ts`
- `productColor()`: trocar `bg-blue-100 text-blue-800` → `bg-blue-500/15 text-blue-400`, idem para purple e green

### Padrão
Todas as cores `*-100 text-*-800` (light-mode) serão substituídas por `*-500/15 text-*-400` (dark-friendly com fundo semi-transparente), consistente com o padrão já usado em `PainelGeral.tsx` e `InsightsTable.tsx`.

