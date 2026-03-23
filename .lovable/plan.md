

## Corrigir layout da página Tarefas de Receita

### Problema
A página `ReceitaTasks.tsx` usa `<div className="space-y-6">` como container raiz, sem padding nem `max-width`. Todas as outras páginas usam o padrão `p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full`.

### Solução
Alterar a linha 93 do `src/pages/ReceitaTasks.tsx`:

**De:** `<div className="space-y-6">`
**Para:** `<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">`

### Arquivo modificado
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ReceitaTasks.tsx` | Adicionar classes de padding, max-width e centralização ao container raiz |

Uma única linha de código resolve o problema de overflow.

