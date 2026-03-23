import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Lightbulb } from 'lucide-react'

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'action'
  title: string
  metric: string
  description: string
  product: 'Academy' | 'Business' | 'Skills' | 'Ambos' | 'Geral'
  priority: 'Alta' | 'Média' | 'Baixa'
}

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  positive: { label: 'Positivo', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  negative: { label: 'Alerta', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
  neutral: { label: 'Oportunidade', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400' },
  action: { label: 'Ação', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
}

const PRIORITY_CONFIG: Record<string, { dot: string }> = {
  Alta: { dot: 'bg-red-500' },
  Média: { dot: 'bg-amber-500' },
  Baixa: { dot: 'bg-gray-400' },
}

const PRODUCT_COLORS: Record<string, string> = {
  Academy: '#8B5CF6',
  Business: '#F59E0B',
  Skills: '#EC4899',
  Ambos: '#1E3A5F',
  Geral: '#6B7280',
}

interface InsightsTableProps {
  insights: Insight[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  title?: string
  subtitle?: string
}

export function InsightsTable({
  insights,
  isLoading = false,
  error = null,
  onRetry,
  title = 'Insights & Recomendações',
  subtitle = 'Análise específica dos dados desta página',
}: InsightsTableProps) {
  const [filterProduct, setFilterProduct] = useState('Todos')
  const [filterPriority, setFilterPriority] = useState('Todas')
  const [filterType, setFilterType] = useState('Todos')

  const products = useMemo(() => Array.from(new Set(insights.map(i => i.product))), [insights])
  const types = useMemo(() => Array.from(new Set(insights.map(i => i.type))), [insights])

  const filtered = useMemo(() => {
    return insights.filter(i => {
      if (filterProduct !== 'Todos' && i.product !== filterProduct) return false
      if (filterPriority !== 'Todas' && i.priority !== filterPriority) return false
      if (filterType !== 'Todos' && i.type !== filterType) return false
      return true
    })
  }, [filterProduct, filterPriority, filterType, insights])

  const sorted = useMemo(() => {
    const pOrder: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2 }
    const tOrder: Record<string, number> = { action: 0, negative: 1, neutral: 2, positive: 3 }
    return [...filtered].sort((a, b) => {
      const pDiff = (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9)
      if (pDiff !== 0) return pDiff
      return (tOrder[a.type] ?? 9) - (tOrder[b.type] ?? 9)
    })
  }, [filtered])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 space-y-3">
          <p className="text-muted-foreground">Não foi possível gerar insights.</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Sem dados suficientes para gerar insights.</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              <RefreshCw className="h-4 w-4 mr-2" /> Gerar Insights
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const FilterButton = ({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{sorted.length} de {insights.length}</span>
            {onRetry && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 pt-1">Produto</span>
            <FilterButton label="Todos" active={filterProduct === 'Todos'} count={insights.length} onClick={() => setFilterProduct('Todos')} />
            {products.map(p => (
              <FilterButton key={p} label={p} active={filterProduct === p} count={insights.filter(i => i.product === p).length} onClick={() => setFilterProduct(p)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 pt-1">Prioridade</span>
            <FilterButton label="Todas" active={filterPriority === 'Todas'} onClick={() => setFilterPriority('Todas')} />
            {['Alta', 'Média', 'Baixa'].map(p => {
              const c = insights.filter(i => i.priority === p).length
              return c > 0 ? <FilterButton key={p} label={p} active={filterPriority === p} count={c} onClick={() => setFilterPriority(p)} /> : null
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 pt-1">Tipo</span>
            <FilterButton label="Todos" active={filterType === 'Todos'} onClick={() => setFilterType('Todos')} />
            {types.map(t => (
              <FilterButton key={t} label={TYPE_CONFIG[t]?.label || t} active={filterType === t} count={insights.filter(i => i.type === t).length} onClick={() => setFilterType(t)} />
            ))}
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-2">
          {sorted.map((insight, idx) => {
            const tc = TYPE_CONFIG[insight.type] || TYPE_CONFIG.neutral
            const pc = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.Baixa
            return (
              <div key={idx} className={`p-3 rounded-lg border ${tc.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={`text-[10px] ${tc.text} border-current`}>
                        {tc.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${pc.dot}`} />
                        <span className="text-[10px] text-muted-foreground">{insight.priority}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[insight.product] }} />
                        <span className="text-[10px] text-muted-foreground">{insight.product}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-lg font-bold font-mono tabular-nums">{insight.metric}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
