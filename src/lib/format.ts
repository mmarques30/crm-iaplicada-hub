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
