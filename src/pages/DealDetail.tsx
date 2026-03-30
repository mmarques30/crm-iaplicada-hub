import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency, qualificationBadgeVariant } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Mail, Phone, Building2, FileText, MessageSquare, Video,
  StickyNote, ArrowRightLeft, Clock, FileX, Instagram, Edit2, Save, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MessageCadence } from '@/components/crm/MessageCadence';

const activityIcons: Record<string, any> = {
  email: Mail, whatsapp: MessageSquare, instagram: Instagram,
  call: Phone, meeting: Video, note: StickyNote, stage_change: ArrowRightLeft,
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("deals_full").select("*").eq("id", id!).single();
      return data as any;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["deal_stages", deal?.pipeline_id],
    enabled: !!deal?.pipeline_id,
    queryFn: async () => {
      const { data } = await supabase.from("stages").select("*").eq("pipeline_id", deal!.pipeline_id!).order("display_order");
      return data || [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["deal_activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("deal_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Edit form
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const openEdit = () => {
    if (!deal) return;
    setEditForm({
      amount: deal.amount || '',
      stage_id: deal.stage_id || '',
      qualification_status: deal.qualification_status || 'lead',
      canal_origem: deal.canal_origem || '',
      name: deal.name || '',
    });
    setEditOpen(true);
  };

  const updateDeal = useMutation({
    mutationFn: async (form: Record<string, any>) => {
      const updates: Record<string, any> = {
        name: form.name || deal.name,
        amount: form.amount ? parseFloat(form.amount) : null,
        stage_id: form.stage_id || deal.stage_id,
        qualification_status: form.qualification_status || 'lead',
        canal_origem: form.canal_origem || null,
      };
      // Check if stage is won/lost
      const selectedStage = stages?.find(s => s.id === form.stage_id);
      if (selectedStage?.is_won) {
        updates.is_won = true;
        updates.closed_at = new Date().toISOString();
      } else if (selectedStage?.is_lost) {
        updates.is_won = false;
        updates.closed_at = new Date().toISOString();
      } else {
        updates.is_won = null;
        updates.closed_at = null;
      }
      const { error } = await supabase.from("deals").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal atualizado");
      setEditOpen(false);
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72" />
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        </div>
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <FileX className="h-16 w-16 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Deal não encontrado</h2>
        <Button variant="outline" asChild><Link to="/pipeline/business">Voltar para Pipeline</Link></Button>
      </div>
    );
  }

  const totalStages = stages?.filter(s => !s.is_won && !s.is_lost).length || 1;
  const currentOrder = deal.stage_order || 0;
  const progress = Math.min((currentOrder / totalStages) * 100, 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/pipeline/${deal.product}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{deal.name}</h1>
            <p className="text-sm text-muted-foreground">{deal.pipeline_name}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
          <Edit2 className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações do Deal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-xl font-bold" style={{ color: '#E8A43C' }}>{formatCurrency(Number(deal.amount))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estágio Atual</p>
              <Badge variant="secondary">{deal.stage_name}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-sm">{deal.days_in_stage || 0} dias no estágio</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qualificação</p>
              <Badge className={qualificationBadgeVariant(deal.qualification_status || 'lead')}>
                {(deal.qualification_status || 'lead').toUpperCase()}
              </Badge>
            </div>
            {deal.canal_origem && (
              <div>
                <p className="text-xs text-muted-foreground">Canal de Origem</p>
                <p className="text-sm">{deal.canal_origem}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-sm">{formatDate(deal.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Progresso no Pipeline</CardTitle></CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3 mb-3" />
              <div className="flex justify-between text-xs text-muted-foreground overflow-x-auto gap-1">
                {stages?.filter(s => !s.is_won && !s.is_lost).map((s) => (
                  <span key={s.id} className={`shrink-0 ${s.id === deal.stage_id ? 'text-[#AFC040] font-semibold' : ''}`}>
                    {s.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {deal.contact_id && (
            <Card>
              <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
              <CardContent>
                <Link to={`/contacts/${deal.contact_id}`} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-[#141A04] flex items-center justify-center">
                    <span className="text-sm font-bold text-[#AFC040]">
                      {(deal.contact_first_name || "?")[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deal.contact_first_name} {deal.contact_last_name || ""}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {deal.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{deal.contact_email}</span>}
                      {deal.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{deal.contact_phone}</span>}
                      {deal.contact_company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{deal.contact_company}</span>}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cadência de Mensagens */}
      {deal.contact_id && (
        <MessageCadence
          contact={{
            id: deal.contact_id,
            first_name: deal.contact_first_name || deal.name,
            last_name: deal.contact_last_name,
            email: deal.contact_email,
            phone: deal.contact_phone,
            company: deal.contact_company,
          }}
          deal={{
            id: deal.id,
            name: deal.name,
            product: deal.product,
            stage_name: deal.stage_name,
            amount: deal.amount,
          }}
          product={deal.product}
        />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Atividades</CardTitle></CardHeader>
        <CardContent>
          {activities?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-4">
              {activities?.map((a) => {
                const Icon = activityIcons[a.type] || FileText;
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{a.subject || a.type}</p>
                        <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                      </div>
                      {a.body && <p className="text-sm text-muted-foreground mt-0.5">{a.body}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Edit Deal Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Deal</DialogTitle>
            <DialogDescription>Atualize valor, estágio e qualificação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Deal</Label>
              <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={editForm.amount || ''} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estágio</Label>
              <Select value={editForm.stage_id || ''} onValueChange={v => setEditForm(p => ({ ...p, stage_id: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.is_won ? '(Ganho)' : s.is_lost ? '(Perdido)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Qualificação</Label>
              <Select value={editForm.qualification_status || 'lead'} onValueChange={v => setEditForm(p => ({ ...p, qualification_status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="mql">MQL</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Canal de Origem</Label>
              <Select value={editForm.canal_origem || '_none'} onValueChange={v => setEditForm(p => ({ ...p, canal_origem: v === '_none' ? '' : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Não informado</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicação">Indicação</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold gap-1.5"
              disabled={updateDeal.isPending}
              onClick={() => updateDeal.mutate(editForm)}
            >
              {updateDeal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
