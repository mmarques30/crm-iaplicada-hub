import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  accentColor: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  onClick?: () => void
}

export function KPICard({ label, value, sub, accentColor, icon: Icon, trend, onClick }: KPICardProps) {
  return (
    <div
      className={`relative bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-[18px_20px] flex flex-col gap-1 transition-colors hover:border-[var(--c-border-h)] ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderLeft: `3px solid ${accentColor}` }}
      onClick={onClick}
    >
      <div className="absolute top-4 right-4">
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--c-text-s)' }}>{label}</p>
      <p className="text-[28px] font-bold font-mono tabular-nums leading-tight" style={{ color: accentColor }}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--c-text-m)' }}>{sub}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend.positive ? (
            <TrendingUp className="h-3 w-3" style={{ color: 'var(--c-green)' }} />
          ) : (
            <TrendingDown className="h-3 w-3" style={{ color: 'var(--c-coral)' }} />
          )}
          <span className="text-[11px] font-medium" style={{ color: trend.positive ? 'var(--c-green)' : 'var(--c-coral)' }}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  )
}
