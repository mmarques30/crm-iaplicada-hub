import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Lightbulb } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'action'
  title: string
  metric: string
  description: string
  product: 'Academy' | 'Business' | 'Skills' | 'Ambos' | 'Geral'
  priority: 'Alta' | 'Média' | 'Baixa'
}

type InsightStatus = 'pendente' | 'em_execucao' | 'concluido'

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  positive: { label: 'Positivo', bg: 'bg-green-500/10', text: 'text-green-400' },
  negative: { label: 'Alerta', bg: 'bg-red-500/10', text: 'text-red-400' },
  neutral: { label: 'Oportunidade', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  action: { label: 'Ação', bg: 'bg-amber-500/10', text: 'text-amber-400' },
}

const PRIORITY_CONFIG: Record<string, { dot: string }> = {
  Alta: { dot: 'bg-red-500' },
  Média: { dot: 'bg-amber-500' },
  Baixa: { dot: 'bg-muted-foreground' },
}

const PRODUCT_COLORS: Record<string, string> = {
  Academy: '#AFC040',
  Business: '#9EB038',
  Skills: '#738925',
  Ambos: '#7E89AC',
  Geral: '#7E89AC',
}

const STATUS_CONFIG: Record<InsightStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_execucao: { label: 'Em execução', className: 'bg-amber-500/15 text-amber-400' },
  concluido: { label: 'Concluído', className: 'bg-green-500/15 text-green-400' },
}

interface InsightsTableProps {
  insights: Insight[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  title?: string
  subtitle?: string
  context?: string
}

function getStorageKey(context: string, idx: number) {
  return `insight-status-${context}-${idx}`
}

export function InsightsTable({
  insights,
  isLoading = false,
  error = null,
  onRetry,
  title = 'Insights & Recomendações',
  subtitle = 'Análise específica dos dados desta página',
  context = 'general',
}: InsightsTableProps) {
  const { toast } = useToast()
  const [filterProduct, setFilterProduct] = useState('Todos')
  const [filterPriority, setFilterPriority] = useState('Todas')
  const [filterType, setFilterType] = useState('Todos')

  const [statuses, setStatuses] = useState<Record<number, InsightStatus>>(() => {
    const loaded: Record<number, InsightStatus> = {}
    insights.forEach((_, idx) => {
      const saved = localStorage.getItem(getStorageKey(context, idx))
      if (saved) loaded[idx] = saved as InsightStatus
    })
    return loaded
  })

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

  const handleStatusChange = useCallback(async (insight: Insight, globalIdx: number, newStatus: InsightStatus) => {
    const oldStatus = statuses[globalIdx] || 'pendente'
    
    localStorage.setItem(getStorageKey(context, globalIdx), newStatus)
    setStatuses(prev => ({ ...prev, [globalIdx]: newStatus }))

    if (newStatus === 'em_execucao' && oldStatus !== 'em_execucao') {
      const { error: insertError } = await supabase.from('receita_tasks' as any).insert({
        title: insight.title,
        description: insight.description,
        metric: insight.metric,
        product: insight.product,
        priority: insight.priority,
        source_context: context,
        status: 'em_execucao',
      } as any)

      if (insertError) {
        toast({ title: 'Erro ao criar tarefa', description: insertError.message, variant: 'destructive' })
      } else {
        toast({ title: 'Tarefa criada', description: `"${insight.title}" adicionada às tarefas de receita.` })
      }
    }
  }, [context, statuses, toast])

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
        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos ({insights.length})</SelectItem>
                {products.map(p => (
                  <SelectItem key={p} value={p}>{p} ({insights.filter(i => i.product === p).length})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {['Alta', 'Média', 'Baixa'].map(p => {
                  const c = insights.filter(i => i.priority === p).length
                  return c > 0 ? <SelectItem key={p} value={p}>{p} ({c})</SelectItem> : null
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {types.map(t => (
                  <SelectItem key={t} value={t}>{TYPE_CONFIG[t]?.label || t} ({insights.filter(i => i.type === t).length})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {sorted.map((insight, idx) => {
            const globalIdx = insights.indexOf(insight)
            const tc = TYPE_CONFIG[insight.type] || TYPE_CONFIG.neutral
            const pc = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.Baixa
            const currentStatus = statuses[globalIdx] || 'pendente'
            return (
              <div key={idx} className={`p-3 rounded-lg border border-white/[0.06] ${tc.bg}`}>
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
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className="text-lg font-bold font-mono tabular-nums">{insight.metric}</span>
                    <Select value={currentStatus} onValueChange={(v) => handleStatusChange(insight, globalIdx, v as InsightStatus)}>
                      <SelectTrigger className={`h-7 w-32 text-[10px] font-medium border-0 ${STATUS_CONFIG[currentStatus].className}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_execucao">Em execução</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
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
