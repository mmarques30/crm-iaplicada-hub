

## Plano: Exportar Contatos em CSV

### Alteração

#### `src/pages/Contacts.tsx`

- Adicionar botão **"Exportar CSV"** (ícone Download) ao lado do botão "Novo Contato" no header
- A exportação respeitará os filtros ativos (busca, origem, produto, cargo, etc.) — exporta os mesmos contatos visíveis na tabela
- Função `handleExportCSV`:
  1. Busca **todos** os contatos filtrados do Supabase (sem paginação, loop em batches de 1000 para contornar o limite)
  2. Gera CSV com colunas: Nome, Sobrenome, Email, Telefone, Empresa, Cargo, Produto Interesse, UTM Source, Lifecycle Stage, Criado em
  3. Dispara download via `Blob` + `URL.createObjectURL`
  4. Toast de sucesso/erro

### Arquivo afetado
- `src/pages/Contacts.tsx`

