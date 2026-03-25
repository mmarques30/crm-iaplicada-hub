import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface EditVendaDialogProps {
  venda: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditVendaDialog({ venda, open, onOpenChange }: EditVendaDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (venda) {
      setForm({
        nome: venda.nome || '',
        email: venda.email || '',
        telefone: venda.telefone || '',
        produto: venda.produto || 'academy',
        valor: venda.valor || 0,
        data_venda: venda.data_venda || '',
        forma_pagamento: venda.forma_pagamento || 'pix_a_vista',
        parcelas: venda.parcelas || 1,
        status: venda.status || 'em_andamento',
        por_indicacao: venda.por_indicacao || false,
        cpf_cnpj: venda.cpf_cnpj || '',
        razao_social: venda.razao_social || '',
        inscricao_municipal: venda.inscricao_municipal || '',
        email_fiscal: venda.email_fiscal || '',
        telefone_fiscal: venda.telefone_fiscal || '',
        descricao_servico: venda.descricao_servico || '',
        endereco: venda.endereco || '',
        cep: venda.cep || '',
        observacoes_fiscais: venda.observacoes_fiscais || '',
        status_nf: venda.status_nf || 'pendente',
        numero_nf: venda.numero_nf || '',
        data_envio_nf: venda.data_envio_nf || '',
      })
    }
  }, [venda])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('vendas')
        .update({
          nome: form.nome,
          email: form.email || null,
          telefone: form.telefone || null,
          produto: form.produto,
          valor: Number(form.valor),
          data_venda: form.data_venda,
          forma_pagamento: form.forma_pagamento,
          parcelas: Number(form.parcelas),
          status: form.status,
          por_indicacao: form.por_indicacao,
          cpf_cnpj: form.cpf_cnpj || null,
          razao_social: form.razao_social || null,
          inscricao_municipal: form.inscricao_municipal || null,
          email_fiscal: form.email_fiscal || null,
          telefone_fiscal: form.telefone_fiscal || null,
          descricao_servico: form.descricao_servico || null,
          endereco: form.endereco || null,
          cep: form.cep || null,
          observacoes_fiscais: form.observacoes_fiscais || null,
          status_nf: form.status_nf,
          numero_nf: form.numero_nf ? Number(form.numero_nf) : null,
          data_envio_nf: form.data_envio_nf || null,
        })
        .eq('id', venda.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-vendas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-parcelas'] })
      queryClient.invalidateQueries({ queryKey: ['gestao-notas-fiscais'] })
      onOpenChange(false)
      toast.success('Venda atualizada com sucesso!')
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  })

  if (!venda) return null

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
          <DialogDescription>Atualize os dados da venda, fiscal e status.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Produto</Label>
              <Select value={form.produto} onValueChange={v => set('produto', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academy">Academy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="skills">Skills</SelectItem>
                  <SelectItem value="ferramentas">Ferramentas</SelectItem>
                  <SelectItem value="hora_trabalho">Hora Trabalho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <Input type="number" min="0" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Data Venda</Label>
              <Input type="date" value={form.data_venda} onChange={e => set('data_venda', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Forma Pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={v => set('forma_pagamento', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix_a_vista">PIX à Vista</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="entrada_boleto">Entrada + Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Parcelas</Label>
              <Input type="number" min="1" max="24" value={form.parcelas} onChange={e => set('parcelas', e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input type="checkbox" checked={form.por_indicacao} onChange={e => set('por_indicacao', e.target.checked)} className="rounded accent-[#AFC040]" />
              <Label className="cursor-pointer text-sm">Por indicação (10%)</Label>
            </div>
          </div>

          {/* Fiscal section */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium mb-3">Dados Fiscais</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>CPF/CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Razão Social</Label>
                <Input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label>Inscrição Municipal</Label>
                <Input value={form.inscricao_municipal} onChange={e => set('inscricao_municipal', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email Fiscal</Label>
                <Input type="email" value={form.email_fiscal} onChange={e => set('email_fiscal', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label>Telefone Fiscal</Label>
                <Input value={form.telefone_fiscal} onChange={e => set('telefone_fiscal', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={e => set('endereco', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={e => set('cep', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Status NF</Label>
                <Select value={form.status_nf} onValueChange={v => set('status_nf', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="emitida">Emitida</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label>Nº NF</Label>
                <Input type="number" value={form.numero_nf} onChange={e => set('numero_nf', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Data Envio NF</Label>
                <Input type="date" value={form.data_envio_nf} onChange={e => set('data_envio_nf', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2 mt-3">
              <Label>Descrição do Serviço</Label>
              <Textarea value={form.descricao_servico} onChange={e => set('descricao_servico', e.target.value)} rows={2} />
            </div>
            <div className="grid gap-2 mt-3">
              <Label>Observações Fiscais</Label>
              <Textarea value={form.observacoes_fiscais} onChange={e => set('observacoes_fiscais', e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold"
            disabled={!form.nome || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
