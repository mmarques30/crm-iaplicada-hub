

## Plano: Forçar apenas 6 canais na aba Origem

### Problema
Valores como `Fb`, `OTHER_CAMPAIGNS`, `ActiveCampaign` não são capturados pelo `normalizeChannel` e aparecem como cards extras. O fallback atual retorna o valor bruto capitalizado em vez de agrupá-lo num dos 6 canais permitidos.

### Alterações

#### 1. `src/lib/format.ts` — `normalizeChannel`
- Adicionar mapeamentos faltantes: `fb` → Ads, `other_campaigns` / `email_marketing` / `activecampaign` → Ads
- **Remover o fallback** que retorna o valor capitalizado — qualquer valor não reconhecido deve ir para "Offline" (contato sem rastreio digital claro)

#### 2. `src/components/dashboard/OrigemTab.tsx`
- Filtrar `channelData` para mostrar **apenas** os 6 canais definidos: Offline, Instagram, Tráfego Direto, Ads, TikTok, YouTube
- Remover "Não rastreado" dos cards visíveis (agrupar esses contatos em "Offline")

### Arquivos afetados
- `src/lib/format.ts`
- `src/components/dashboard/OrigemTab.tsx`

