

## Ajustar Layout do Pipeline: Tudo em Uma Linha + Remover Skills

### Problema
1. Os "Estágios Finais" (Negócio Fechado, Negócio Perdido) ficam abaixo dos estágios ativos, em uma seção separada. Deveriam ficar lado a lado na mesma linha horizontal.
2. A aba "Skills" no seletor de pipeline não deveria existir.

### Correções em `src/pages/Pipeline.tsx`

#### 1. Unificar todos os estágios em uma única linha horizontal
Remover a separação entre `activeStages` e `closedStages`. Todas as colunas (incluindo Negócio Fechado e Negócio Perdido) ficam na mesma `div` com scroll horizontal, lado a lado.

Substituir o bloco atual (linhas 341-358) que renderiza duas seções separadas por uma única:
```tsx
<div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-thin">
  {(stages || []).map((stage) => (
    <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] || []} 
      total={stageTotal(stage.id)} daysInStage={daysInStage} navigate={navigate}
      isClosed={stage.is_won || stage.is_lost} />
  ))}
</div>
```

#### 2. Remover aba Skills
Na linha 202, remover `<TabsTrigger value="skills">Skills</TabsTrigger>`, mantendo apenas Business e Academy.

### Arquivo modificado
| Arquivo | Alteração |
|---|---|
| `src/pages/Pipeline.tsx` | Unificar estágios em linha única + remover tab Skills |

