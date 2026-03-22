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
    case 'sql': return 'border-l-qualification-sql';
    case 'mql': return 'border-l-qualification-mql';
    default: return 'border-l-qualification-lead';
  }
};

export const qualificationBadgeVariant = (status: string) => {
  switch (status) {
    case 'sql': return 'bg-qualification-sql/15 text-qualification-sql';
    case 'mql': return 'bg-qualification-mql/15 text-qualification-mql';
    default: return 'bg-muted text-muted-foreground';
  }
};
