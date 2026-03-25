import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { DollarSign, CheckCircle, AlertCircle } from 'lucide-react'

export function RepassesTab() {
  const queryClient = useQueryClient()

  const { data: repasses, isLoading } = useQuery({
    queryKey: ['gestao-repasses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('repasses')
        .select('*, vendas!inner(nome, produto, valor, data_venda)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async (repasseId: string) => {
      const repasse = allRepasses.find((r: any) => r.id === repasseId)
      // Mark repasse as paid
      const { error } = await (supabase as any)
        .from('repasses')
        .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
        .eq('id', repasseId)
      if (error) throw error

      // Create expense entry
      if (repasse) {
        await (supabase as any).from('despesas').insert({
          descricao: `Repasse indicação — ${repasse.vendas?.nome || 'N/A'} (${repasse.indicador_nome || 'Indicador'})`,
          valor: Number(repasse.valor || 0),
          data: new Date().toISOString().split('T')[0],
          categoria: 'repasse_indicacao',
          status: 'pago',
          tipo: 'pontual',
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-repasses'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
      toast.success('Repasse marcado como pago!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const markPendingMutation = useMutation({
    mutationFn: async (repasseId: string) => {
      const { error } = await (supabase as any)
        .from('repasses')
        .update({ status: 'pendente', data_pagamento: null })
        .eq('id', repasseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-repasses'] })
      toast.success('Repasse revertido para pendente!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const allRepasses: any[] = repasses || []
  const totalRepasses = allRepasses.reduce((s, r) => s + Number(r.valor || 0), 0)
  const pagos = allRepasses.filter(r => r.status === 'pago')
  const pendentes = allRepasses.filter(r => r.status === 'pendente')
  const valorPago = pagos.reduce((s, r) => s + Number(r.valor || 0), 0)
  const valorPendente = pendentes.reduce((s, r) => s + Number(r.valor || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Repasses" value={formatCurrency(totalRepasses)} sub={`${allRepasses.length} repasses`} icon={DollarSign} accentColor="#4A9FE0" />
        <KPICard label="Valor Pago" value={formatCurrency(valorPago)} sub={`${pagos.length} pagos`} icon={CheckCircle} accentColor="#AFC040" />
        <KPICard label="Valor Pendente" value={formatCurrency(valorPendente)} sub={`${pendentes.length} pendentes`} icon={AlertCircle} accentColor="#E8A43C" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repasses por Indicação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--c-raised)]">
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Produto</TableHead>
                  <TableHead className="font-medium text-right">Valor Contrato</TableHead>
                  <TableHead className="font-medium text-right">Valor Repasse</TableHead>
                  <TableHead className="font-medium">Indicador</TableHead>
                  <TableHead className="font-medium">Data Venda</TableHead>
                  <TableHead className="font-medium">Pagamento</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium w-[120px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : allRepasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum repasse encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  allRepasses.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-[var(--c-raised)]">
                      <TableCell className="font-medium">{r.vendas?.nome || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-xs bg-muted text-muted-foreground">
                          {r.vendas?.produto || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(Number(r.vendas?.valor || 0))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium" style={{ color: '#E8A43C' }}>
                        {formatCurrency(Number(r.valor || 0))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.indicador_nome || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.vendas?.data_venda)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.data_pagamento ? formatDate(r.data_pagamento) : '—'}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${r.status === 'pago' ? 'bg-[#141A04] text-[#AFC040]' : 'bg-[#1A1206] text-[#E8A43C]'}`}>
                          {r.status === 'pago' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === 'pago' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            disabled={markPendingMutation.isPending}
                            onClick={() => markPendingMutation.mutate(r.id)}
                          >
                            Reverter
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
                            disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate(r.id)}
                          >
                            Marcar Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
