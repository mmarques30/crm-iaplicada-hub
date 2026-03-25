

## Ajuste: Tabelas com 10 linhas iniciais + botão expandir

### O que muda

Substituir a paginação atual (50 por página com Anterior/Próximo) por um modelo "mostrar 10 iniciais + expandir":

- Mostrar apenas as **10 primeiras linhas** por padrão
- Botão **"Ver todos (X leads)"** abaixo da tabela para expandir e mostrar todos os registros
- Quando expandido, botão muda para **"Mostrar menos"** para recolher de volta a 10

### Implementação — `src/pages/CrmAnalytics.tsx`

1. **Trocar estados** — Substituir `aulaPage` e `visitantePage` por `aulaExpanded: boolean` e `visitanteExpanded: boolean` (ambos `false` por padrão)

2. **Lógica de slice** — Em ambas as tabelas:
   - Se `expanded === false`: `.slice(0, 10)`
   - Se `expanded === true`: sem slice (mostra todos)

3. **Substituir controles de paginação** — Trocar os botões Anterior/Próximo por:
   - Quando recolhido: `"Ver todos (115 leads)"` com ícone ChevronDown
   - Quando expandido: `"Mostrar menos"` com ícone ChevronUp
   - Só aparece se total > 10

4. **Remover** `PAGE_SIZE`, imports de `ChevronLeft`/`ChevronRight` (se não usados em outro lugar), e a lógica de página

5. **Adicionar import** `ChevronDown`, `ChevronUp` do lucide-react

