import { Card, CardContent } from '@/components/ui/card'
import { AnimatedNumber } from './AnimatedNumber'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  icon: LucideIcon
  color?: string
  borderColor?: string
  subtitle?: string
}

export function MetricCard({ title, value, prefix, suffix, decimals, icon: Icon, color = 'text-primary', borderColor, subtitle }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden" style={borderColor ? { borderTop: `3px solid ${borderColor}` } : undefined}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        </div>
        <p className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${color}`}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
