
## Plano: corrigir “Deals por Canal” na Visão Consolidada

### Diagnóstico
O problema na aba **Canais** da página `src/pages/PainelGeral.tsx` é que o card **“Deals por Canal”** ainda usa `canal_origem` bruto de `deals_full`, enquanto a tabela **“Contatos por Canal de Origem”** já aplica uma normalização mais inteligente via `contactsBySource`.  
Resultado: os nomes, agrupamentos e totais ficam difíceis de entender e não batem visualmente com o restante do produto.

Também há o mesmo desalinhamento em `src/pages/CrmAnalytics.tsx`, onde a aba **Fontes** ainda usa `canal_origem` cru em vários cálculos.

### O que vou ajustar

#### 1. Criar uma única regra de normalização de canais
Centralizar em um helper compartilhado em `src/lib/format.ts` ou util similar:
- converter valores brutos de `canal_origem`, `utm_source`, `fonte_registro` e sinais auxiliares em labels consistentes
- usar os mesmos nomes já adotados no produto:
  - Instagram Orgânico
  - Facebook Ads
  - Tráfego Direto
  - WhatsApp
  - Formulário / Orgânico
  - Offline
  - Não rastreado

Isso elimina divergência entre páginas.

#### 2. Corrigir a Visão Consolidada (`src/pages/PainelGeral.tsx`)
Refatorar `dealsByChannel` para:
- buscar mais contexto de `deals_full` quando necessário
- aplicar a mesma normalização usada na distribuição de contatos
- consolidar canais equivalentes antes de montar o gráfico

Melhorias visuais no card **Deals por Canal**:
- manter gráfico vertical horizontalizado
- usar as mesmas cores da tabela/lista de canais
- exibir labels numéricos nas barras
- ajustar altura dinamicamente conforme quantidade de canais
- alinhar nomes e ordenação com a tabela de contatos

#### 3. Sincronizar com o CRM Analytics (`src/pages/CrmAnalytics.tsx`)
Aplicar a mesma função de normalização em:
- `dealsByChannel`
- `sourceMap`
- evolução mensal
- cálculo de principal fonte por produto

Assim, a leitura de canais/fontes fica igual entre **Visão Consolidada** e **CRM Analytics**.

#### 4. Melhorar clareza da regra de conversão
Hoje a visão consolidada mistura:
- contatos por origem
- deals por origem
- oportunidades/customers por estágios distintos

Vou alinhar os agrupamentos para que o usuário veja os mesmos canais com os mesmos nomes em todos os blocos, reduzindo a sensação de inconsistência.

### Arquivos afetados
- `src/pages/PainelGeral.tsx`
- `src/pages/CrmAnalytics.tsx`
- `src/lib/format.ts` (ou outro util compartilhado)

### Detalhes técnicos
- Não precisa mudança de banco ou migration.
- A correção é de camada de apresentação/transformação de dados.
- A ideia principal é substituir lógica local duplicada por um helper único de normalização.
- Depois disso, todos os gráficos/tabelas que usam `canal_origem` passam a falar a mesma “língua”.

### Resultado esperado
Na aba **Canais** da **Visão Consolidada**:
- os deals por canal ficarão legíveis
- os nomes baterão com os dados “já corrigidos” em outras páginas
- o usuário verá totals e comparações coerentes entre contatos, deals e conversões
