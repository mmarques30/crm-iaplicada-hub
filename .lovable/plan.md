

## Rebranding Completo + Responsividade

### Problemas Atuais
- Páginas usam `max-w-7xl` fixo sem responsividade mobile
- Header badges no Financeiro/PainelGeral quebram em telas pequenas
- Grids de 6 colunas (MetricCards) não se adaptam bem
- Tabelas não scrollam horizontalmente em mobile
- Pipeline Kanban não tem comportamento mobile
- Sidebar não mostra logo no mobile
- Falta consistência visual entre páginas

### Plano de Implementação

#### 1. CSS Global - Melhorar base visual (`src/index.css`)
- Adicionar `scroll-smooth` ao html
- Melhorar background do `main` com gradiente sutil
- Adicionar utility classes para containers responsivos

#### 2. AppLayout - Header responsivo (`src/components/layout/AppLayout.tsx`)
- Adicionar busca mobile (ícone que expande)
- Header sticky com `backdrop-blur`
- Breadcrumb ou título da página no header mobile

#### 3. Todas as páginas - Container responsivo
Substituir `p-6 max-w-7xl` por `p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full` em:

| Pagina | Mudanças adicionais |
|--------|-------------------|
| `Index.tsx` | Grid cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Chart height responsivo |
| `Contacts.tsx` | Tabela com `overflow-x-auto`, colunas opcionais hidden em mobile |
| `Pipeline.tsx` | Kanban horizontal scroll com snap em mobile, header flex-wrap |
| `Settings.tsx` | `max-w-4xl mx-auto`, integrations grid `grid-cols-1 sm:grid-cols-2` |
| `Financeiro.tsx` | Badges flex-wrap, tabela scroll, grids responsivos |
| `PainelGeral.tsx` | Metric grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`, header stack em mobile |
| `InstagramAnalytics.tsx` | Mesma grid responsiva |
| `FacebookAdsPage.tsx` | Mesma grid responsiva |
| `CrmAnalytics.tsx` | Mesma grid responsiva |
| `InstagramAutomations.tsx` | Cards auto-width, dialog full-screen em mobile |
| `ContactDetail.tsx` | Grid `grid-cols-1 lg:grid-cols-3`, info stack em mobile |
| `DealDetail.tsx` | Mesma abordagem |

#### 4. Componentes - Refinamento visual
- **MetricCard**: Padding responsivo `p-4 sm:pt-6`, icon size menor em mobile
- **Card**: Manter shadow atual, OK
- **AppLayout header**: `sticky top-0 z-30 backdrop-blur-sm bg-background/95`

#### 5. Sidebar mobile
- Já usa `collapsible="icon"` do shadcn — funciona. Garantir que o trigger esteja visível no mobile

### Arquivos a modificar (13 arquivos)
`src/index.css`, `src/components/layout/AppLayout.tsx`, `src/components/dashboard/MetricCard.tsx`, `src/pages/Index.tsx`, `src/pages/Contacts.tsx`, `src/pages/Pipeline.tsx`, `src/pages/Settings.tsx`, `src/pages/Financeiro.tsx`, `src/pages/PainelGeral.tsx`, `src/pages/InstagramAnalytics.tsx`, `src/pages/FacebookAdsPage.tsx`, `src/pages/CrmAnalytics.tsx`, `src/pages/InstagramAutomations.tsx`

### Padrão de container usado em todas as páginas
```tsx
<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
```

### Padrão de grid para MetricCards
```tsx
// 6 cards → grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
// 4 cards → grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

