

## Redesign: Tema Dark com Cores da Marca

### Objetivo
Migrar o sistema para um tema dark inspirado no dashboard Figma referenciado, mas substituindo os tons de roxo/azul pelos verdes da marca IAplicada (Brand 900 #738925 até Brand 100 #F6F7E9). O layout dark com glassmorphism-lite será mantido.

### Mapeamento de Cores

| Referência Figma | Valor usado (marca) |
|---|---|
| Background #080F25 | `#080F25` (mantido) |
| Sidebar/Card #212C4D | `#1A2A1A` (navy-esverdeado para harmonizar com marca) |
| Primary accent #6C72FF | `#9EB038` (Brand 600 - verde vibrante) |
| Secondary accent #57C3FF | `#AFC040` (Brand 600) |
| Gradient diagonal | from `#738925` to `#AFC040` |
| Text primary #FFFFFF | `#FFFFFF` (mantido) |
| Text secondary #7E89AC | `#8A9A6E` (secundário esverdeado) |
| Success #00C48C | `#00C48C` (mantido) |
| Danger #FF647C | `#FF647C` (mantido) |
| Warning #FDB52A | `#FDB52A` (mantido) |
| Card border | `rgba(255,255,255,0.06)` |

### Arquivos Modificados (8 arquivos)

#### 1. `src/index.css` — Variáveis CSS completas
- Substituir todas as variáveis `:root` para tema dark permanente
- Background: `#080F25`, Card/Popover: `#212C4D` (ou navy-verde)
- Primary: Brand 600 (#AFC040)
- Foreground: branco, muted-foreground: `#7E89AC`
- Sidebar: `#0D1520` com foreground branco
- Bordas: `rgba(255,255,255,0.1)` equivalente em HSL
- Adicionar classe `.gradient-blob` para decoração top-right

#### 2. `tailwind.config.ts` — Border radius
- Atualizar `--radius` para `0.75rem` (12px cards) — já está correto
- Adicionar utilidades para glassmorphism se necessário

#### 3. `src/components/ui/card.tsx` — Glassmorphism
- Adicionar `border border-white/[0.06]` e remover `shadow-sm hover:shadow-md`
- Substituir por `backdrop-blur-sm` para efeito glassmorphism-lite

#### 4. `src/components/layout/AppLayout.tsx` — Header dark + blob decorativo
- Header: fundo dark, backdrop-blur mais forte
- Adicionar div decorativa com gradient blob (absolute, top-right, opacity baixa)
- Input de busca: fundo escuro semi-transparente

#### 5. `src/components/layout/AppSidebar.tsx` — Active state com borda esquerda
- Trocar `bg-sidebar-accent` por borda esquerda verde + highlight sutil (como no Figma)
- Usar `border-l-2 border-brand-600` no item ativo

#### 6. `src/pages/Index.tsx` — Chart colors
- Substituir array `CHART_COLORS` por escala da marca (Brand 900→100)
- Tooltip com estilo dark

#### 7. `src/pages/PainelGeral.tsx` — Cores dos charts e badges
- Substituir cores hardcoded (`#E1306C`, `#1877F2`, etc.) por tons da marca nos elementos que "fogem do tom"
- Manter cores de plataformas (Instagram rosa, Facebook azul) apenas nos SourceSummaryCards — são identificadores de marca externa
- Badges: trocar `bg-pink-100`, `bg-blue-100` por variantes dark-friendly

#### 8. `src/components/dashboard/MetricCard.tsx` e `SourceSummaryCard.tsx`
- Ajustar bordas e backgrounds para dark theme
- Textos e ícones com cores claras

#### 9. `src/components/dashboard/InsightsTable.tsx`
- Ajustar TYPE_CONFIG e STATUS_CONFIG para dark-first (sem `dark:` prefixes — tudo é dark)
- Badges com backgrounds semi-transparentes

#### 10. `src/pages/ReceitaTasks.tsx`
- Ajustar cores de status badges para dark theme
- Cards com glassmorphism

### Abordagem Técnica
- Todas as mudanças centralizam-se nas variáveis CSS em `index.css` — a maioria dos componentes herdará automaticamente
- Componentes com cores hardcoded (charts, badges com `bg-pink-100`) precisam de ajuste individual
- Font family mantém Sora (já configurada), mas adicionar Mona Sans como import para heading fallback
- Sem `darkMode` toggle — o tema será permanentemente dark

