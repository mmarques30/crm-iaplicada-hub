import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency, productLabel, qualificationBadgeVariant } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail, Phone, Building2, Briefcase, Globe, MessageSquare, Video, FileText,
  ArrowRightLeft, StickyNote, ArrowLeft, UserX, Instagram, Edit2, Save, Loader2,
  MapPin, Linkedin, GraduationCap, HelpCircle, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const activityIcons: Record<string, any> = {
  email: Mail, whatsapp: MessageSquare, instagram: Instagram,
  call: Phone, meeting: Video, note: StickyNote, stage_change: ArrowRightLeft,
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: contact, isLoading, isError } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["contact_activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("contact_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["contact_deals", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("deals_full").select("*").eq("contact_id", id!);
      return (data || []) as any[];
    },
  });

  // Edit form state
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const openEdit = () => {
    if (!contact) return;
    setEditForm({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: (contact as any).whatsapp || '',
      company: contact.company || '',
      cargo: contact.cargo || '',
      faixa_de_faturamento: contact.faixa_de_faturamento || '',
      renda_mensal: (contact as any).renda_mensal || '',
      numero_de_liderados: (contact as any).numero_de_liderados || '',
      area_atuacao: (contact as any).area_atuacao || '',
      motivo_para_aprender_ia: (contact as any).motivo_para_aprender_ia || '',
      objetivo_com_a_comunidade: (contact as any).objetivo_com_a_comunidade || '',
      lifecycle_stage: (contact as any).lifecycle_stage || '',
      lead_status: (contact as any).lead_status || '',
      city: (contact as any).city || '',
      state: (contact as any).state || '',
      linkedin_url: (contact as any).linkedin_url || '',
      website_url: (contact as any).website_url || '',
    });
    setEditOpen(true);
  };

  const updateContact = useMutation({
    mutationFn: async (form: Record<string, any>) => {
      const cleanForm: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        cleanForm[k] = v || null;
      }
      const { error } = await supabase.from("contacts").update(cleanForm).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado");
      setEditOpen(false);
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-64" /><Skeleton className="h-64 lg:col-span-2" /></div>
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <UserX className="h-16 w-16 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Contato não encontrado</h2>
        <Button variant="outline" asChild><Link to="/contacts">Voltar para Contatos</Link></Button>
      </div>
    );
  }

  const c = contact as any;

  const infoItems = [
    { icon: Mail, label: "Email", value: c.email },
    { icon: Phone, label: "Telefone", value: c.phone },
    { icon: MessageSquare, label: "WhatsApp", value: c.whatsapp },
    { icon: Building2, label: "Empresa", value: c.company },
    { icon: Briefcase, label: "Cargo", value: c.cargo },
    { icon: Globe, label: "Faturamento", value: c.faixa_de_faturamento },
    { icon: Globe, label: "Renda Mensal", value: c.renda_mensal },
    { icon: GraduationCap, label: "Nº Liderados", value: c.numero_de_liderados },
    { icon: Target, label: "Área de Atuação", value: c.area_atuacao },
  ];

  const locationItems = [
    c.city && c.state ? `${c.city}, ${c.state}` : c.city || c.state,
    c.linkedin_url,
    c.website_url,
  ].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/contacts"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{c.first_name} {c.last_name || ""}</h1>
            <p className="text-sm text-muted-foreground">{c.company || "Sem empresa"}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
          <Edit2 className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      {/* Lifecycle / Lead Status badges */}
      <div className="flex flex-wrap gap-2">
        {c.lifecycle_stage && (
          <Badge className="bg-[#141A04] text-[#AFC040]">Lifecycle: {c.lifecycle_stage}</Badge>
        )}
        {c.lead_status && (
          <Badge className="bg-[#1A1206] text-[#E8A43C]">Status: {c.lead_status}</Badge>
        )}
        {c.fonte_registro && (
          <Badge variant="secondary">Fonte: {c.fonte_registro}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Info Card ─── */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm">{item.value || "—"}</p>
                </div>
              </div>
            ))}

            {locationItems.length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Localização & Links</p>
                {(c.city || c.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.city}{c.city && c.state && ', '}{c.state}
                  </div>
                )}
                {c.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#4A9FE0] hover:underline truncate">{c.linkedin_url}</a>
                  </div>
                )}
                {c.website_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="text-[#4A9FE0] hover:underline truncate">{c.website_url}</a>
                  </div>
                )}
              </>
            )}

            <Separator />
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">WhatsApp Opt-in</p>
                <Badge variant={c.whatsapp_opt_in ? "default" : "secondary"}>{c.whatsapp_opt_in ? "Sim" : "Não"}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Instagram Opt-in</p>
                <Badge variant={c.instagram_opt_in ? "default" : "secondary"}>{c.instagram_opt_in ? "Sim" : "Não"}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Produtos de Interesse</p>
              <div className="flex flex-wrap gap-1">
                {c.produto_interesse?.map((p: string) => (
                  <Badge key={p} variant="secondary">{productLabel[p] || p}</Badge>
                )) || <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
            {(c.utm_source || c.utm_medium || c.utm_campaign) && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">UTM</p>
                {c.utm_source && <p className="text-xs">Source: {c.utm_source}</p>}
                {c.utm_medium && <p className="text-xs">Medium: {c.utm_medium}</p>}
                {c.utm_campaign && <p className="text-xs">Campaign: {c.utm_campaign}</p>}
                {c.utm_term && <p className="text-xs">Term: {c.utm_term}</p>}
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Right Column ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Perguntas de Inscrição */}
          {(c.motivo_para_aprender_ia || c.objetivo_com_a_comunidade) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[#E8A43C]" />
                  Respostas da Inscrição
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {c.motivo_para_aprender_ia && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Por que quer aprender IA?</p>
                    <p className="text-sm bg-[var(--c-raised)] p-3 rounded-lg">{c.motivo_para_aprender_ia}</p>
                  </div>
                )}
                {c.objetivo_com_a_comunidade && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Objetivo com a comunidade</p>
                    <p className="text-sm bg-[var(--c-raised)] p-3 rounded-lg">{c.objetivo_com_a_comunidade}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Atividades */}
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{a.subject || a.type}</p>
                            <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                          </div>
                          {a.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deals */}
      {deals && deals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deals.map((d: any) => (
                <Link key={d.id} to={`/deals/${d.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.stage_name} · {d.pipeline_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(Number(d.amount))}</p>
                    <Badge className={`text-[10px] ${qualificationBadgeVariant(d.qualification_status || 'lead')}`}>
                      {(d.qualification_status || 'lead').toUpperCase()}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Edit Contact Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>Atualize as informações de {c.first_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-fname">Nome</Label>
                <Input id="ed-fname" value={editForm.first_name || ''} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-lname">Sobrenome</Label>
                <Input id="ed-lname" value={editForm.last_name || ''} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-email">Email</Label>
                <Input id="ed-email" type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-phone">Telefone</Label>
                <Input id="ed-phone" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-whatsapp">WhatsApp</Label>
                <Input id="ed-whatsapp" value={editForm.whatsapp || ''} onChange={e => setEditForm(p => ({ ...p, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-company">Empresa</Label>
                <Input id="ed-company" value={editForm.company || ''} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-cargo">Cargo</Label>
                <Input id="ed-cargo" value={editForm.cargo || ''} onChange={e => setEditForm(p => ({ ...p, cargo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-area">Área de Atuação</Label>
                <Input id="ed-area" value={editForm.area_atuacao || ''} onChange={e => setEditForm(p => ({ ...p, area_atuacao: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Faturamento</Label>
                <Select value={editForm.faixa_de_faturamento || '_none'} onValueChange={v => setEditForm(p => ({ ...p, faixa_de_faturamento: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não informado</SelectItem>
                    <SelectItem value="Menos de R$ 1 milhão">{'< R$ 1M'}</SelectItem>
                    <SelectItem value="Entre 1MM e 5MM">1M - 5M</SelectItem>
                    <SelectItem value="Entre 5MM e 10MM">5M - 10M</SelectItem>
                    <SelectItem value="Entre 10MM e 50MM">10M - 50M</SelectItem>
                    <SelectItem value="Acima de 50MM">{'>50M'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Renda Mensal</Label>
                <Select value={editForm.renda_mensal || '_none'} onValueChange={v => setEditForm(p => ({ ...p, renda_mensal: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não informado</SelectItem>
                    <SelectItem value="De R$ 1.000 a R$ 4.000">R$1k-4k</SelectItem>
                    <SelectItem value="De R$ 4.001 a R$ 8.000">R$4k-8k</SelectItem>
                    <SelectItem value="De R$ 8.001 a R$ 12.000">R$8k-12k</SelectItem>
                    <SelectItem value="Acima de R$ 12.000">{'>R$12k'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº Liderados</Label>
                <Input value={editForm.numero_de_liderados || ''} onChange={e => setEditForm(p => ({ ...p, numero_de_liderados: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle Stage</Label>
                <Select value={editForm.lifecycle_stage || '_none'} onValueChange={v => setEditForm(p => ({ ...p, lifecycle_stage: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não definido</SelectItem>
                    <SelectItem value="subscriber">Subscriber</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="marketingqualifiedlead">MQL</SelectItem>
                    <SelectItem value="salesqualifiedlead">SQL</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lead Status</Label>
                <Select value={editForm.lead_status || '_none'} onValueChange={v => setEditForm(p => ({ ...p, lead_status: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não definido</SelectItem>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="unqualified">Desqualificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={editForm.city || ''} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input value={editForm.state || ''} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input value={editForm.linkedin_url || ''} onChange={e => setEditForm(p => ({ ...p, linkedin_url: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={editForm.website_url || ''} onChange={e => setEditForm(p => ({ ...p, website_url: e.target.value }))} />
              </div>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label>Por que quer aprender IA?</Label>
              <Textarea rows={3} value={editForm.motivo_para_aprender_ia || ''} onChange={e => setEditForm(p => ({ ...p, motivo_para_aprender_ia: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo com a comunidade</Label>
              <Textarea rows={3} value={editForm.objetivo_com_a_comunidade || ''} onChange={e => setEditForm(p => ({ ...p, objetivo_com_a_comunidade: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#AFC040] text-[#0D0D0D] hover:bg-[#AFC040]/90 font-semibold gap-1.5"
              disabled={updateContact.isPending}
              onClick={() => updateContact.mutate(editForm)}
            >
              {updateContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
