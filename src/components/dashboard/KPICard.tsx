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
      className={`relative bg-card border border-border rounded-xl p-6 flex flex-col gap-1 transition-colors hover:border-border/80 min-w-0 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="absolute top-4 right-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-[5px] h-[5px] rounded-[2px] flex-shrink-0" style={{ background: accentColor }} />
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
      {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend.positive ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-destructive" />
          )}
          <span className={`text-[11px] font-medium ${trend.positive ? 'text-green-500' : 'text-destructive'}`}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  )
}
