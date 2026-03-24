

## Remover "Skills" do Menu Lateral

### Problema
O item "Skills" ainda aparece no submenu Pipeline do sidebar, apesar de ter sido desativado na página Pipeline.

### Correção
**Arquivo:** `src/components/layout/AppSidebar.tsx`, linha 19-22

Remover a entrada `{ title: "Skills", url: "/pipeline/skills", icon: Brain }` do array `pipelineItems`, mantendo apenas Business e Academy.

Também remover o import `Brain` do lucide-react (linha 1), já que não será mais usado.

| Arquivo | Alteração |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Remover item Skills do `pipelineItems` + remover import `Brain` |

