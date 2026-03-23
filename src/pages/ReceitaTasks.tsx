import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ListTodo, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ReceitaTask {
  id: string
  title: string
  description: string | null
  metric: string | null
  product: string | null
  priority: string | null
  source_context: string | null
  status: string
  created_at: string | null
  completed_at: string | null
}

const CONTEXT_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook_ads: 'Facebook Ads',
  crm: 'Funil de Vendas',
  financeiro: 'Financeiro',
  painel: 'Painel Geral',
}

const PRIORITY_DOT: Record<string, string> = {
  Alta: 'bg-red-500',
  Média: 'bg-amber-500',
  Baixa: 'bg-gray-400',
}

export default function ReceitaTasks() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterProduct, setFilterProduct] = useState('todos')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['receita-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receita_tasks' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any
      if (error) throw error
      return (data || []) as ReceitaTask[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status }
      if (status === 'concluido') updates.completed_at = new Date().toISOString()
      else updates.completed_at = null
      const { error } = await supabase.from('receita_tasks' as any).update(updates).eq('id', id) as any
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receita-tasks'] }),
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receita_tasks' as any).delete().eq('id', id) as any
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receita-tasks'] })
      toast({ title: 'Tarefa removida' })
    },
  })

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'todos' && t.status !== filterStatus) return false
    if (filterProduct !== 'todos' && t.product !== filterProduct) return false
    return true
  })

  const products = Array.from(new Set(tasks.map(t => t.product).filter(Boolean)))

  const emExecucao = tasks.filter(t => t.status === 'em_execucao').length
  const concluidos = tasks.filter(t => t.status === 'concluido').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tarefas de Receita</h1>
        <p className="text-muted-foreground">Insights em execução que se tornam tarefas acionáveis</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Total de tarefas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{emExecucao}</p>
                <p className="text-xs text-muted-foreground">Em execução</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{concluidos}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="w-44">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="em_execucao">Em execução</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os produtos</SelectItem>
              {products.map(p => (
                <SelectItem key={p!} value={p!}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Marque insights como "Em execução" nas páginas de analytics para criar tarefas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {task.source_context && (
                        <Badge variant="secondary" className="text-[10px]">
                          {CONTEXT_LABELS[task.source_context] || task.source_context}
                        </Badge>
                      )}
                      {task.product && (
                        <Badge variant="outline" className="text-[10px]">{task.product}</Badge>
                      )}
                      {task.priority && (
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority] || 'bg-gray-400'}`} />
                          <span className="text-[10px] text-muted-foreground">{task.priority}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    )}
                    {task.metric && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">Métrica: {task.metric}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Criada em {task.created_at ? format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
                      {task.completed_at && ` · Concluída em ${format(new Date(task.completed_at), "dd/MM/yyyy", { locale: ptBR })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v })}
                    >
                      <SelectTrigger className={`h-8 w-32 text-xs font-medium ${
                        task.status === 'concluido'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-0'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-0'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_execucao">Em execução</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask.mutate(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
