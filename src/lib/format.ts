export const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatPercent = (value: number | null | undefined) => {
  if (value == null) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

export const productLabel: Record<string, string> = {
  business: 'Business',
  skills: 'Skills',
  academy: 'Academy',
};

export const qualificationColor = (status: string) => {
  switch (status) {
    case 'sql': return 'border-l-[#AFC040]';
    case 'mql': return 'border-l-[#4A9FE0]';
    default: return 'border-l-[#2CBBA6]';
  }
};

export const qualificationBadgeVariant = (status: string) => {
  switch (status) {
    case 'sql': return 'bg-[#141A04] text-[#AFC040]';
    case 'mql': return 'bg-[#040E1A] text-[#4A9FE0]';
    default: return 'bg-[#031411] text-[#2CBBA6]';
  }
};

export const humanizeCampaignName = (raw: string, maxLen = 25): string => {
  if (!raw) return '—';
  let s = raw
    .replace(/^(LEADS?_|VENDAS?_|PF_|AUT_|CONV_|TRAF_|CAMP_)+/gi, '')
    .replace(/_/g, ' ')
    .trim();
  // Title Case
  s = s
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
  if (s.length > maxLen) s = s.substring(0, maxLen).trimEnd() + '…';
  return s || raw.substring(0, maxLen);
};

export const mapFbObjective = (objective: string | null | undefined, name: string): string => {
  const v = (objective || name || '').toLowerCase();
  if (v.includes('outcome_leads') || v.includes('lead_generation') || v.includes('lead')) return 'Leads';
  if (v.includes('outcome_sales') || v.includes('conversion') || v.includes('venda') || v.includes('sales')) return 'Vendas';
  if (v.includes('outcome_traffic') || v.includes('link_click') || v.includes('traffic') || v.includes('trafego')) return 'Tráfego';
  if (v.includes('outcome_awareness') || v.includes('reach') || v.includes('awareness') || v.includes('alcance')) return 'Alcance';
  return 'Outros';
};

export const daysAgo = (date: string): number => {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const formatDateTime = (date: string | null | undefined) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const productColor = (product: string) => {
  const colors: Record<string, string> = {
    business: 'bg-[#141A04] text-[#AFC040]',
    skills: 'bg-[#031411] text-[#2CBBA6]',
    academy: 'bg-[#040E1A] text-[#4A9FE0]',
  };
  return colors[product] ?? 'bg-muted text-muted-foreground';
};

/**
 * Normaliza valores brutos de canal_origem, utm_source, fonte_registro
 * em labels consistentes usados em todo o produto.
 */
export const normalizeChannel = (raw: string | null | undefined): string => {
  if (!raw) return 'Offline';
  const v = raw.trim().toLowerCase();

  // Instagram
  if (v === 'instagram' || v === 'instagram orgânico' || v === 'social_media' || v === 'ig' || v === 'organic_social') return 'Instagram';

  // Ads (Facebook, Google, paid, email marketing, activecampaign, etc.)
  if (['paid', 'facebook', 'facebook ads', 'meta', 'paid_social', 'paid_search', 'fb_ads', 'facebook_ads', 'google ads', 'google_ads', 'ads', 'fb', 'other_campaigns', 'email_marketing', 'activecampaign', 'whatsapp', 'wpp', 'manychat'].includes(v)) return 'Ads';

  // Tráfego Direto
  if (['direct', 'direct_traffic', 'tráfego direto', 'direto', 'organic', 'organic_search', 'formulário', 'formulário / orgânico', 'form', 'google', 'seo', 'referral'].includes(v)) return 'Tráfego Direto';

  // TikTok
  if (v === 'tiktok' || v === 'tik_tok' || v === 'tt' || v === 'tiktok_ads') return 'TikTok';

  // YouTube
  if (v === 'youtube' || v === 'yt' || v === 'youtube_ads') return 'YouTube';

  // Offline
  if (v === 'offline' || v === 'evento' || v === 'indicação' || v === 'indicacao') return 'Offline';

  // Qualquer valor não reconhecido → Offline
  return 'Offline';
};
