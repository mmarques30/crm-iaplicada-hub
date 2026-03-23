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
  subtitle?: string
}

export function MetricCard({ title, value, prefix, suffix, decimals, icon: Icon, color = 'text-primary', subtitle }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className={`text-lg sm:text-2xl font-bold mt-1 ${color}`}>
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[hsl(var(--brand-100))] flex items-center justify-center shrink-0">
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
