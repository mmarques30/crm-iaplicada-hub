

## Corrigir botões "Exportar" com verde fluorescente

O botão "Exportar" na dashboard (`Index.tsx`) usa `bg-accent` que aponta para `#A8E63D` (verde lima fluorescente). Deve usar a cor da marca `#738925` (verde oliva / `bg-primary`).

### Alterações

**1. `src/pages/Index.tsx` — Botão Exportar (linha 569)**
- De: `className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"`
- Para: `className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"`

**2. `src/pages/Index.tsx` — Badge de filtro ativo (linha 566)**
- De: `bg-accent text-foreground`
- Para: `bg-primary text-primary-foreground`

O botão "Exportar CSV" em `Contacts.tsx` já usa `variant="outline"` (sem verde fluorescente) — está correto.

Os demais `bg-accent` no sistema são hover states padrão de componentes shadcn (calendar, menus, etc.) — esses são sutis e não precisam de mudança.

