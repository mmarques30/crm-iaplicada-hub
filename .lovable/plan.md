

## Plano: Corrigir Repasses — FK + Dados

### Problema
A tabela `repasses` não tem foreign key para `vendas`, então a query PostgREST com `vendas!inner(...)` falha silenciosamente. Os 2 registros existentes não aparecem.

### Solução

**1. Migração SQL — Adicionar FK**
```sql
ALTER TABLE repasses 
  ADD CONSTRAINT repasses_venda_id_fkey 
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE;
```

**2. Verificar dados atuais**
Já existem 2 repasses no banco (Valéria Sales e Ariane Calados, ambos pagos). Com a FK, o join passará a funcionar e os dados aparecerão automaticamente.

### Arquivos afetados
- Nova migração SQL (apenas adicionar FK constraint)
- Nenhuma alteração de código necessária — `RepassesTab.tsx` já está correto

