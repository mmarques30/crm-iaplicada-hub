

## Plano: Corrigir ROI no Painel Geral e Paginação do Collector

### Problemas

1. **Dashboard-collector sem paginação**: Campanhas e insights usam `limit=50` sem paginar. Logs confirmam apenas 6 campanhas. Se houver mais, são perdidas.
2. **Aba ROI simplificada**: O layout atual mostra 3 cards simples. O Manus mostra dois painéis lado a lado: "Custo por Contato por Canal" (com badges de CPL coloridos e valor de investimento) e "Resumo de ROI" (com Contatos, Custo/Contato, Opportunities por canal).
3. **Classificação de canais incompleta**: O Manus separa "Instagram Orgânico" (grátis), "Facebook Ads (Paid)" e "Campanhas Meta (Ads)" como canais distintos com CPL individual. O código atual agrupa tudo em "Facebook Ads".

### Alterações

#### 1. `supabase/functions/dashboard-collector/index.ts` — Paginar FB Ads

Nas linhas 85-94, substituir as 4 fetches paralelas por lógica paginada:
- **Campaigns**: Loop com `while (url) { fetch → push → url = data.paging?.next }` em vez de `limit=50`
- **Insights (campaign-level)**: Mesmo loop de paginação
- **Ads**: Mesmo loop de paginação (já usa limit=100 mas sem paginar)
- Manter `dailyInsights` como está (usa `time_increment=1` que já retorna tudo)

#### 2. `src/pages/PainelGeral.tsx` — Redesenhar aba ROI

Substituir os 3 cards simples (linhas 563-600) por dois painéis lado a lado conforme o Manus:

**Painel esquerdo: "Custo por Contato por Canal"**
- 3 linhas com fundo colorido sutil (rosa para IG, azul para FB Ads, roxo para Campanhas Meta)
- Cada linha: badge circular com CPL abreviado ($0, $122, $36), nome do canal, "X contatos · Y opportunities", valor CPL grande à direita
- Se custo=0: mostrar "Grátis" em verde. Se custo>0: mostrar valor com "Invest: R$ X"
- Rodapé: "CPL médio ponderado: R$ X"

**Painel direito: "Resumo de ROI"**
- 3 blocos por canal, cada um com: nome, badge de investimento, Contatos/Custo por Contato/Opportunities em 3 colunas
- Texto descritivo contextual: "Custo zero — melhor ROI", "100% conversão para opportunity", "Melhor custo por lead pago"

**Lógica de dados**: Reusar `channelDistribution` + `investment` existentes. Calcular CPL por canal: Instagram=R$0, Facebook Ads=investimento/contatos_ads, Campanhas Meta=investimento/contatos_meta.

#### 3. Classificação "Campanhas Meta (Ads)"

No `channelDistribution` (linhas 107-128), adicionar detecção de "Campanhas Meta" para contatos cuja `utm_campaign` ou `utm_medium` indica campanha Meta mas `utm_source` não é explicitamente `paid`/`facebook`. Isso cria o terceiro canal que aparece no Manus.

### Arquivos afetados
- `supabase/functions/dashboard-collector/index.ts` — paginação
- `src/pages/PainelGeral.tsx` — redesenho da aba ROI + classificação de canal

