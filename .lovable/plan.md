

## Corrigir Dados nos Cards do Dashboard

### Problema Identificado
A query de contatos em `src/pages/Index.tsx` (linha 132) usa o nome de coluna errado `lifecyclestage` quando o nome real na tabela é `lifecycle_stage`. Isso causa um erro 400 do Supabase, resultando em `contacts = null` e o card "Total de Leads" mostrando 0.

Os demais dados (product_metrics, stage_conversion, deals) estão retornando corretamente (status 200).

### Correção

**Arquivo:** `src/pages/Index.tsx`, linha 132

Trocar:
```tsx
const { data } = await supabase.from("contacts").select("id, lifecyclestage, created_at");
```
Por:
```tsx
const { data } = await supabase.from("contacts").select("id, lifecycle_stage, created_at");
```

### Resultado Esperado
- O card "Total de Leads" passará a mostrar o total real de contatos
- A query não retornará mais erro 400

