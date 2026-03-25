

## Plano: Upload de HTML + Correção Visual com IA nos Templates de Email

### Resumo
Adicionar um botão "Importar HTML" no editor de templates que aceita upload de arquivos `.html`, renderiza o conteúdo no editor, e permite usar IA (Lovable AI Gateway) para analisar e corrigir problemas visuais do HTML importado.

### Alterações

#### 1. Edge Function `supabase/functions/fix-email-html/index.ts` (novo)
- Recebe o HTML bruto e uma instrução opcional do usuário
- Envia para Lovable AI Gateway pedindo para corrigir problemas de renderização em clientes de email (inline styles, compatibilidade, responsividade, estrutura com tables)
- Retorna o HTML corrigido

#### 2. `src/pages/EmailTemplateEditor.tsx`
- Adicionar botão **"Importar HTML"** (ícone Upload) na barra de ações do header, ao lado de "Gerar Email com IA"
- Input file oculto que aceita `.html,.htm` — ao selecionar, lê o conteúdo via `FileReader` e popula `form.html_body`
- Adicionar botão **"Corrigir com IA"** (ícone Wand) que aparece quando há HTML no editor
  - Chama `supabase.functions.invoke('fix-email-html', { body: { html: form.html_body } })`
  - Substitui o `html_body` com o HTML corrigido retornado pela IA
  - Toast de sucesso/erro

#### 3. `src/pages/EmailTemplates.tsx` — Dialog "Novo Template"
- Adicionar zona de upload de HTML no dialog de criação (drag & drop ou botão)
- Ao importar, preenche um campo `html_body` que é salvo junto com o template na criação

#### 4. `src/pages/EmailCampaigns.tsx` — Sem alterações
- Campanhas já usam templates existentes; o HTML importado fica no template

### Detalhes técnicos

**Edge Function fix-email-html:**
- Usa `LOVABLE_API_KEY` (já configurado) para chamar `https://ai.gateway.lovable.dev/v1/chat/completions`
- System prompt instrui a IA a: converter CSS externo para inline, usar tables para layout, garantir responsividade, corrigir problemas de renderização em Gmail/Outlook, manter tokens `{{contact.*}}` intactos
- Retorna apenas o HTML corrigido (sem markdown, sem explicação)

**Upload no editor:**
- `<input type="file" accept=".html,.htm" />` oculto, acionado por botão
- `FileReader.readAsText()` para ler o conteúdo
- Limite de 500KB para evitar problemas

### Arquivos afetados
- `supabase/functions/fix-email-html/index.ts` (novo)
- `src/pages/EmailTemplateEditor.tsx` (upload + botão "Corrigir com IA")
- `src/pages/EmailTemplates.tsx` (upload no dialog de criação)

