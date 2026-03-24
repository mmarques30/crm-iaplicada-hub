

## Unificar Estágios em Linha Única + Collapse por Coluna

### Problema
1. Os estágios finais (Negócio Fechado, Negócio Perdido) ainda estão em uma seção separada abaixo dos estágios ativos.
2. Não há opção de expandir/retrair (collapse) cada coluna individualmente.

### Correções em `src/pages/Pipeline.tsx`

#### 1. Todos os estágios em uma única linha horizontal
Remover a separação entre `activeStages` e `closedStages` (linhas 358-375). Renderizar todos os stages em um único `div` com scroll horizontal:
```tsx
<div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-thin">
  {(stages || []).map((stage) => (
    <KanbanColumn key={stage.id} stage={stage} ... />
  ))}
</div>
```
Remover os memos `activeStages` e `closedStages` que já não serão necessários.

#### 2. Adicionar collapse (expandir/retrair) em cada coluna
- Adicionar state `collapsedStages` (um `Set<string>`) no componente `KanbanColumn` usando `useState(false)`.
- No header de cada coluna, adicionar um botão com ícone `ChevronDown`/`ChevronRight` que alterna a visibilidade dos deals.
- Quando colapsado: a coluna mostra apenas o header (nome, badge de contagem, valor total) com largura reduzida (~48px), orientação vertical do texto.
- Quando expandido: comportamento atual normal (w-72 com todos os cards).

### Resultado
- Todas as colunas lado a lado em uma linha, sem separação "Estágios Finais"
- Cada coluna pode ser individualmente colapsada/expandida clicando no header

