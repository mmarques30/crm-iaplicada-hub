

## Pipeline - Todas as colunas na mesma linha + Ocultar colunas

### Problema
As colunas "Negócio Fechado" e "Negócio Perdido" (is_won/is_lost) estão separadas em uma seção abaixo do board principal. O usuário quer todas as colunas na mesma linha horizontal e a possibilidade de ocultar colunas específicas.

### Mudanças no `src/pages/Pipeline.tsx`

#### 1. Unificar todas as colunas em uma única linha
- Remover a separação entre `activeStages` e `closedStages`
- Renderizar **todos** os estágios (incluindo won/lost) no mesmo flex container horizontal com scroll

#### 2. Adicionar controle de visibilidade de colunas
- Adicionar estado `hiddenStages` (Set de IDs)
- Adicionar um botão dropdown (Popover) no header com checkboxes para cada estágio
- Ícone `Eye`/`EyeOff` ou `SlidersHorizontal` ao lado do título
- Ao desmarcar um estágio, a coluna some do board
- Persistir no `localStorage` por pipeline

#### 3. Visual
- Colunas won/lost mantêm sua cor diferenciada (verde/vermelho) mas ficam na mesma linha
- Botão de filtro discreto ao lado das tabs de produto

### Arquivo modificado
| Arquivo | O que muda |
|---------|-----------|
| `src/pages/Pipeline.tsx` | Remover separação active/closed, adicionar estado hiddenStages com popover de checkboxes, todas colunas na mesma linha |

