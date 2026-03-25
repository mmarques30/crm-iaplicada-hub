import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'

interface VendaParcelasDialogProps {
  vendaId: string | null
  vendaNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parcelaStatusBadge(status: string, dataVencimento: string) {
  const today = new Date().toISOString().split('T')[0]
  const isVencida = status === 'pendente' && dataVencimento < today
  if (status === 'pago') return <Badge className="bg-[#141A04] text-[#AFC040] text-xs">Pago</Badge>
  if (isVencida) return <Badge className="bg-[#1A0604] text-[#E8684A] text-xs">Vencida</Badge>
  return <Badge className="bg-[#1A1206] text-[#E8A43C] text-xs">Pendente</Badge>
}

export function VendaParcelasDialog({ vendaId, vendaNome, open, onOpenChange }: VendaParcelasDialogProps) {
  const queryClient = useQueryClient()

  const { data: parcelas, isLoading } = useQuery({
    queryKey: ['venda-parcelas', vendaId],
    queryFn: async () => {
      if (!vendaId) return []
      const { data, error } = await (supabase as any)
        .from('parcelas')
        .select('*')
        .eq('venda_id', vendaId)
        .order('numero', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!vendaId && open,
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const update: any = { status: newStatus }
      if (newStatus === 'pago') update.data_pagamento = new Date().toISOString().split('T')[0]
      else update.data_pagamento = null
      const { error } = await (supabase as any).from('parcelas').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venda-parcelas', vendaId] })
      queryClient.invalidateQueries({ queryKey: ['gestao-parcelas'] })
      toast.success('Parcela atualizada!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  const allParcelas: any[] = parcelas || []
  const pagas = allParcelas.filter(p => p.status === 'pago')
  const valorTotal = allParcelas.reduce((s, p) => s + Number(p.valor || 0), 0)
  const valorPago = pagas.reduce((s, p) => s + Number(p.valor || 0), 0)
  const valorRestante = valorTotal - valorPago

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Parcelas — {vendaNome}</DialogTitle>
          <DialogDescription>
            {pagas.length} de {allParcelas.length} pagas · Restante: {formatCurrency(valorRestante)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold font-mono text-sm">{formatCurrency(valorTotal)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="font-bold font-mono text-sm" style={{ color: '#AFC040' }}>{formatCurrency(valorPago)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="font-bold font-mono text-sm" style={{ color: '#E8A43C' }}>{formatCurrency(valorRestante)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">Nº</TableHead>
                <TableHead className="font-medium text-right">Valor</TableHead>
                <TableHead className="font-medium">Vencimento</TableHead>
                <TableHead className="font-medium">Pagamento</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium w-[100px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : allParcelas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma parcela</TableCell>
                </TableRow>
              ) : (
                allParcelas.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.numero}</TableCell>
                    <TableCell className="text-right font-mono font-medium" style={{ color: '#E8A43C' }}>
                      {formatCurrency(Number(p.valor || 0))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.data_vencimento)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.data_pagamento ? formatDate(p.data_pagamento) : '—'}</TableCell>
                    <TableCell>{parcelaStatusBadge(p.status, p.data_vencimento)}</TableCell>
                    <TableCell>
                      {p.status === 'pago' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-[#E8A43C]"
                          disabled={toggleStatusMutation.isPending}
                          onClick={() => toggleStatusMutation.mutate({ id: p.id, newStatus: 'pendente' })}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reverter
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs hover:text-[#AFC040]"
                          disabled={toggleStatusMutation.isPending}
                          onClick={() => toggleStatusMutation.mutate({ id: p.id, newStatus: 'pago' })}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
