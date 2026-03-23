import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideIcon, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SourceMetric {
  label: string
  value: string | number
}

interface SourceSummaryCardProps {
  title: string
  icon: LucideIcon
  accentColor: string
  metrics: SourceMetric[]
  detailLink: string
}

export function SourceSummaryCard({ title, icon: Icon, accentColor, metrics, detailLink }: SourceSummaryCardProps) {
  return (
    <Card className="relative overflow-hidden" style={{ borderTop: `3px solid ${accentColor}` }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums">{typeof m.value === 'number' ? m.value.toLocaleString('pt-BR') : m.value}</p>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs" asChild>
          <Link to={detailLink}>
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
