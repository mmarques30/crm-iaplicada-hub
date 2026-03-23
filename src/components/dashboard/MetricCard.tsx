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
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
