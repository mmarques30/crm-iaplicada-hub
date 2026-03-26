

## Plano: Corrigir Templates e Campanhas de Email

### Problemas identificados

1. **Geração com IA é falsa** — `handleAiGenerate` no editor usa `setTimeout` com HTML fixo em vez de chamar a IA de verdade
2. **Não personaliza ao colar texto** — o editor só tem a aba "Editor" (HTML bruto) e "Visualizar". Não existe uma aba para colar texto simples e gerar HTML formatado automaticamente
3. **Não associa contatos para enviar** — campanhas dependem de listas de contatos, mas falta opção "Todos os Contatos" e não há mecanismo real de envio via email do usuário

### Alterações

#### 1. `src/pages/EmailTemplateEditor.tsx` — Geração com IA real

- Substituir `handleAiGenerate` (fake setTimeout) por chamada real à Edge Function `fix-email-html`, usando o campo `instruction` com o prompt do usuário, tom e tipo selecionados
- Se `html_body` estiver vazio, gerar do zero usando uma instrução como "Crie um email HTML completo sobre: [descrição do usuário], tom: [tom], tipo: [tipo]"
- Se `html_body` já tiver conteúdo, reescrever baseado na instrução

#### 2. `src/pages/EmailTemplateEditor.tsx` — Aba "Texto" para colar conteúdo

- Adicionar terceira aba no editor: "Texto" (entre "Editor" e "Visualizar")
- Nesta aba, um `<Textarea>` onde o usuário cola texto simples
- Ao colar/editar, o texto é convertido automaticamente em HTML básico (parágrafos `<p>`, quebras de linha, preservando tokens `{{contact.*}}`)
- Botão "Aplicar como HTML" que gera o HTML formatado a partir do texto e coloca no `html_body`
- O botão "Corrigir com IA" já existente pode ser usado em seguida para otimizar

#### 3. `src/pages/EmailTemplateEditor.tsx` — Botão "Enviar para Contatos"

- Adicionar botão "Enviar para Contatos" no header do editor
- Ao clicar, abre dialog que:
  - Carrega todos os contatos do Supabase (com email)
  - Permite selecionar contatos individualmente ou "Selecionar Todos"
  - Botão "Abrir no Gmail" que abre Gmail compose com:
    - `to` = email do remetente (from_email do template)
    - `bcc` = todos os emails selecionados
    - `su` = subject do template
    - `body` = text_body ou HTML stripped

#### 4. `src/pages/EmailCampaigns.tsx` — Opção "Todos os Contatos"

- Na criação de campanha, adicionar checkbox "Incluir todos os contatos" como alternativa às listas
- Quando marcado, desabilitar a seleção de listas
- Adicionar botão "Enviar via Gmail" nos cards de campanha (status draft/scheduled) que:
  - Busca os contatos das listas selecionadas (ou todos)
  - Busca o template associado
  - Abre Gmail com BCC de todos os emails

#### 5. `src/pages/EmailTemplates.tsx` — Fix do botão IA na criação

- Substituir `handleGenerateAI` (que só mostra toast "será implementada em breve") por lógica real que chama a Edge Function para gerar o assunto baseado no nome do template

### Arquivos afetados
- `src/pages/EmailTemplateEditor.tsx`
- `src/pages/EmailCampaigns.tsx`
- `src/pages/EmailTemplates.tsx`

