

## Plano: Corrigir Visão Geral do Facebook Ads

### Problemas visíveis no screenshot
1. **Nomes de campanha ilegíveis** — códigos como `LEAD_PF_AUT_AULA_IA_APL...` em todos os gráficos e cards
2. **Pie chart cortado** — label "eads" em vez de "Leads", valor `R$5428.34` cortado à esquerda
3. **CPL filtro restritivo** — `c.costPerLead > 0` exclui campanhas sem leads mas com gasto
4. **Melhor/Pior CPL** com nomes técnicos brutos

### Alterações

#### 1. `src/lib/format.ts` — novo helper `humanizeCampaignName`
```ts
export const humanizeCampaignName = (raw: string, maxLen = 25): string => {
  // Remove prefixos técnicos comuns: LEAD_, LEADS_, VENDAS_, PF_, AUT_
  // Substitui underscores por espaços, aplica Title Case
  // Trunca com "…" se exceder maxLen
}
```

#### 2. `src/pages/FacebookAdsPage.tsx`

**Nomes humanizados** — substituir `shortName(c.name)` por `humanizeCampaignName(c.name)` nos 4 gráficos e nos cards Melhor/Pior CPL.

**Pie chart** — aumentar `outerRadius` de 90→100, adicionar `labelLine={true}`, formatar label para mostrar `{name}: {formatCurrency(value)}` sem cortar.

**CPL relaxado** — mudar filtro de `c.costPerLead > 0` para `c.spend > 0`, calcular CPL inline (`c.leads > 0 ? c.spend / c.leads : c.spend`), permitindo ver campanhas que gastaram mas não geraram leads.

**Objective mapping** — tratar enums reais do Facebook API (`OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`) além dos termos por nome.

### Arquivos afetados
- `src/lib/format.ts`
- `src/pages/FacebookAdsPage.tsx`

