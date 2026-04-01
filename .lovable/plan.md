

## Rebranding Visual Completo — Dark → Light Theme

Transformação visual de tema escuro (verde/preto) para tema claro (bege/branco com sidebar verde escura). Zero alterações em lógica, rotas ou funcionalidades.

### Escopo da mudança

**Problema**: O sistema usa ~350+ cores hardcoded em 14+ arquivos além dos tokens CSS. A migração requer atualizar tokens globais E substituir referências inline.

### Arquivos a editar

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `index.html` | Adicionar fonte Inter (Google Fonts), manter Sora como fallback |
| 2 | `src/index.css` | Reescrever `:root` com nova paleta light, atualizar `--c-*` hex vars, body font-family → Inter, atualizar utilitários (.card-hover, .glass-border, scrollbar) |
| 3 | `tailwind.config.ts` | Sem mudança estrutural — as cores já referenciam as CSS vars que serão atualizadas |
| 4 | `src/components/layout/AppSidebar.tsx` | Sidebar verde escura: bg, texto branco, item ativo com borda esquerda verde lima, dot indicators coloridos por módulo |
| 5 | `src/components/layout/AppLayout.tsx` | Topbar: bg branco, h-14→h-[56px], border-bottom sólida, search input e avatar atualizados |
| 6 | `src/components/dashboard/KPICard.tsx` | Bg branco, border sutil, padding 24px, label com quadrado colorido 5x5, número grande |
| 7 | `src/components/ui/button.tsx` | Primary: verde escuro bg + texto branco. Ghost/secondary: border sutil. Radius 8px |
| 8 | `src/components/ui/tabs.tsx` | TabsList: pill container (bg cinza, radius 999px). TabsTrigger ativo: verde escuro bg, texto branco |
| 9 | `src/components/ui/input.tsx` | Border atualizada, focus ring verde, radius 8px |
| 10 | `src/components/ui/dialog.tsx` | Border-radius 16px, overlay com backdrop-blur |
| 11 | `src/components/ui/card.tsx` | Bg branco, border sutil, radius 12px, sem shadow |
| 12 | `src/components/ui/table.tsx` | Header bg claro, row hover bege-esverdeado |
| 13 | `src/components/ui/sidebar.tsx` | Atualizar SIDEBAR_WIDTH para 240px/64px |
| 14 | `src/pages/Index.tsx` | Atualizar objeto `C` de cores, TOOLTIP_STYLE, hardcoded colors nos BottomCards e gráficos |
| 15-20 | Outras páginas com cores hardcoded | `InstagramAnalytics`, `FacebookAdsPage`, `CrmAnalytics`, `GestaoVendas`, `ConteudoMensagens`, etc. — substituir hex hardcoded por variáveis CSS |

### Detalhes técnicos

**Nova paleta CSS (:root)**

```
--background:          40 25% 96%     /* #F4F0EB bege off-white */
--foreground:          145 60% 10%    /* #0D2818 texto primário */
--card:                0 0% 100%      /* #FFFFFF */
--card-foreground:     145 60% 10%
--primary:             145 60% 11%    /* #0E2F1A verde escuro */
--primary-foreground:  0 0% 100%
--secondary:           145 10% 94%    /* #EDF2ED */
--muted-foreground:    145 15% 45%    /* #627D6A */
--accent:              80 78% 56%     /* #A8E63D verde lima */
--border:              145 10% 88%    /* #D9E3D9 */
--destructive:         0 84% 60%      /* #EF4444 */

Sidebar vars:
--sidebar-background:  145 55% 10%    /* #0D2E18 */
--sidebar-foreground:  0 0% 88%       /* #E0E0E0 */
--sidebar-border:      145 40% 20%    /* separadores */
--sidebar-accent:      145 50% 16%    /* item ativo bg */

Hex vars para inline styles:
--c-card: #FFFFFF; --c-raised: #F7F5F2;
--c-border: #D9E3D9; --c-border-h: #B8CDB8;
--c-text-p: #0D2818; --c-text-s: #627D6A; --c-text-m: #94A89A;

Chart colors:
--c-green: #A8E63D; --c-teal: #4ADE80; --c-blue: #5B9CF6;
--c-amber: #FB923C; --c-coral: #EF4444; --c-purple: #A78BFA;
```

**Sidebar (AppSidebar.tsx)**
- ACTIVE_CLASS → `"bg-[hsl(145,50%,16%)] text-white font-semibold border-l-[3px] border-l-[#A8E63D]"`
- Dot indicators antes do ícone: `<span className="w-[5px] h-[5px] rounded-[2px]" style={{ background: dotColor }} />`
- Cores dos dots: Dashboard=#A8E63D, Contatos=#5B9CF6, Analytics=#A78BFA, Settings=#FB923C, etc.
- Logo area: padding 20px, fundo igual sidebar
- Separadores de grupo: `border-[hsl(145,40%,20%)]`

**Topbar (AppLayout.tsx)**
- `bg-white border-b border-[hsl(145,10%,90%)]` (sem backdrop-blur)
- Search input: `bg-[hsl(145,10%,96%)] border-[hsl(145,10%,88%)] rounded-lg`
- Avatar hover: `hover:ring-2 hover:ring-[#A8E63D]`

**Index.tsx — Hardcoded colors**
- Objeto `C`: Remap completo para cores light
- TOOLTIP_STYLE: bg verde escuro, texto branco
- BottomCards: bg branco, borders sutis, textos escuros
- ~120 referências inline de cor neste arquivo

**Tabs (pill switcher)**
- TabsList: `rounded-full bg-[hsl(145,10%,92%)] p-1`
- TabsTrigger ativo: `bg-[hsl(145,60%,11%)] text-white rounded-full`

### Ordem de execução

1. `index.html` — adicionar fonte Inter
2. `src/index.css` — todos os tokens e utilitários
3. `src/components/ui/sidebar.tsx` — largura 240px/64px
4. `src/components/ui/card.tsx`, `button.tsx`, `input.tsx`, `tabs.tsx`, `dialog.tsx`, `table.tsx` — componentes base
5. `src/components/layout/AppSidebar.tsx` — visual da sidebar
6. `src/components/layout/AppLayout.tsx` — topbar
7. `src/components/dashboard/KPICard.tsx` — cards de métricas
8. `src/pages/Index.tsx` — dashboard principal (cores inline)
9. Demais páginas com cores hardcoded (batch)

### O que NÃO muda

- Rotas, guards, AuthContext, ProtectedRoute
- Hooks, queries, mutations, stores
- Integrações Supabase, edge functions
- Lógica de collapse da sidebar (collapsible="icon")
- Estrutura de dados, props, interfaces TypeScript
- Componentes funcionais (pipeline kanban, formulários, etc.)

### Riscos

- A quantidade de cores hardcoded (~350+ ocorrências) é alta. Algumas páginas menores podem precisar de passes adicionais.
- Gráficos Recharts usam cores inline — cada gráfico precisa atualização individual.

