

## Adicionar Scroll por Arrasto (Grab-to-Scroll) no Pipeline

### Problema
O container do pipeline só permite scroll horizontal usando a scrollbar ou o trackpad. O usuário quer poder "agarrar" e arrastar o board inteiro horizontalmente, de qualquer ponto.

### Solução
Implementar um hook `useGrabScroll` que adiciona comportamento de drag-to-scroll no container do kanban. O usuário poderá clicar e arrastar em qualquer área vazia para mover o pipeline horizontalmente.

### Correções em `src/pages/Pipeline.tsx`

1. Criar um `ref` para o container de scroll do kanban
2. Adicionar event listeners de `mousedown`, `mousemove`, `mouseup` e `mouseleave` no container
3. Quando o mouse é pressionado em área vazia (não em um card), o cursor muda para `grabbing` e o scroll acompanha o movimento do mouse
4. Usar `cursor-grab` no container e `cursor-grabbing` durante o arrasto
5. Garantir que o drag-to-scroll não interfira com o drag-and-drop dos cards (verificar se o target é o container ou espaço vazio)

### Implementação
- Adicionar `useRef` + `useState` para controlar o estado de arrasto
- Handlers `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave` no `div` que contém as colunas
- Classes CSS: `cursor-grab` padrão, `cursor-grabbing select-none` durante arrasto

| Arquivo | Alteração |
|---|---|
| `src/pages/Pipeline.tsx` | Adicionar grab-to-scroll no container horizontal do kanban |

