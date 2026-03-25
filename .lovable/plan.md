

## Plano: Simplificar aba Origem — apenas cards de canal

### Alterações

#### 1. `src/lib/format.ts` — `normalizeChannel`
- Adicionar mapeamento para **TikTok** (`tiktok`, `tik_tok`, `tt`) e **YouTube** (`youtube`, `yt`, `youtube_ads`)
- Renomear "Facebook Ads" para **"Ads"** (englobando Facebook Ads, Google Ads, paid, paid_social, paid_search)
- Manter: Offline, Instagram Orgânico → "Instagram", Tráfego Direto, Ads, TikTok, YouTube, Não rastreado

#### 2. `src/components/dashboard/OrigemTab.tsx`
- **Remover** todas as seções abaixo dos cards de canal:
  - Formulários de Conversão
  - Fonte de Origem × Produto (gráfico)
  - Deals por Produto × Estágio (tabela)
  - Product Summary Cards
- **Remover** imports e useMemos não usados: `formConversion`, `sourceByProduct`, `dealsByProductStage`, `productSummary`, `getDealChannel`, queries de `deals_full` e `stages`, imports de Recharts, Badge, Table, etc.
- **Atualizar** `CHANNEL_COLORS` e `CHANNEL_DESCRIPTIONS` para os 6 canais desejados: Offline, Instagram, Tráfego Direto, Ads, TikTok, YouTube (+ Não rastreado)
- Manter apenas o header card com os cards de canal

### Arquivos afetados
- `src/lib/format.ts`
- `src/components/dashboard/OrigemTab.tsx`

