import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Plus,
  Send,
  Trash2,
  Loader2,
  Calendar,
  Mail,
  Eye,
  MousePointerClick,
  Ban,
  Users,
} from "lucide-react";

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  draft: { label: "Rascunho", classes: "bg-[#191D0C] text-[#7A8460]" },
  scheduled: { label: "Agendada", classes: "bg-[#040E1A] text-[#4A9FE0]" },
  sending: { label: "Enviando", classes: "bg-[#1A1206] text-[#E8A43C]" },
  sent: { label: "Enviada", classes: "bg-[#141A04] text-[#AFC040]" },
  cancelled: { label: "Cancelada", classes: "bg-[#1A0804] text-[#E8684A]" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return (
    <Badge variant="outline" className={`${s.classes} border-0 font-medium`}>
      {s.label}
    </Badge>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EmailCampaigns() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedIncludeLists, setSelectedIncludeLists] = useState<string[]>([]);
  const [selectedExcludeLists, setSelectedExcludeLists] = useState<string[]>([]);
  const [includeAllContacts, setIncludeAllContacts] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_campaigns")
        .select("*, template:email_templates_v2(name, subject)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["email-templates-broadcast"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_templates_v2")
        .select("id, name, subject")
        .eq("type", "broadcast")
        .eq("status", "published")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contactLists } = useQuery({
    queryKey: ["contact-lists"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_lists")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const createCampaign = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: nome,
        template_id: templateId,
        status: scheduledAt ? "scheduled" : "draft",
        scheduled_at: scheduledAt || null,
        include_lists: selectedIncludeLists,
        exclude_lists: selectedExcludeLists,
      };
      const { error } = await (supabase as any)
        .from("email_campaigns")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao criar campanha.");
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("email_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha excluída.");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    },
    onError: () => {
      toast.error("Erro ao excluir campanha.");
    },
  });

  const cancelCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("email_campaigns")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha cancelada.");
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
    },
    onError: () => {
      toast.error("Erro ao cancelar campanha.");
    },
  });

  // ── Helpers ─────────────────────────────────────────────────────────────

  function resetForm() {
    setNome("");
    setTemplateId("");
    setScheduledAt("");
    setSelectedIncludeLists([]);
    setSelectedExcludeLists([]);
  }

  function toggleList(
    id: string,
    selected: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter(
      selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]
    );
  }

  function pct(part: number | null | undefined, total: number | null | undefined) {
    if (!total) return 0;
    return Number((((part ?? 0) / total) * 100).toFixed(1));
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campanhas de E-mail</h1>
          <p className="text-muted-foreground">
            Gerencie seus broadcasts e acompanhe as métricas de envio.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova campanha de e-mail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nome</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex: Black Friday 2026"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {(templates ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agendar para */}
              <div className="space-y-2">
                <Label htmlFor="scheduled-at">Agendar para</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              {/* All contacts toggle */}
              <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <Checkbox
                  checked={includeAllContacts}
                  onCheckedChange={(checked) => {
                    setIncludeAllContacts(!!checked);
                    if (checked) setSelectedIncludeLists([]);
                  }}
                />
                Incluir todos os contatos (ignora listas)
              </label>

              {/* Include lists */}
              <div className="space-y-2">
                <Label>Listas de Envio</Label>
                <div className={`max-h-40 space-y-2 overflow-y-auto rounded-md border p-3 ${includeAllContacts ? 'opacity-50 pointer-events-none' : ''}`}>
                  {(contactLists ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma lista encontrada.</p>
                  )}
                  {(contactLists ?? []).map((list: any) => (
                    <label
                      key={list.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIncludeLists.includes(list.id)}
                        onCheckedChange={() =>
                          toggleList(list.id, selectedIncludeLists, setSelectedIncludeLists)
                        }
                      />
                      {list.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Exclude lists */}
              <div className="space-y-2">
                <Label>Listas de Exclusão</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                  {(contactLists ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma lista encontrada.</p>
                  )}
                  {(contactLists ?? []).map((list: any) => (
                    <label
                      key={list.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedExcludeLists.includes(list.id)}
                        onCheckedChange={() =>
                          toggleList(list.id, selectedExcludeLists, setSelectedExcludeLists)
                        }
                      />
                      {list.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                disabled={!nome || !templateId || createCampaign.isPending}
                onClick={() => createCampaign.mutate()}
              >
                {createCampaign.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Criar Campanha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign list */}
      {campaignsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : !campaigns?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Nenhuma campanha ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie sua primeira campanha clicando em "Nova Campanha".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c: any) => {
            const openRate = pct(c.total_opened, c.total_recipients);
            const clickRate = pct(c.total_clicked, c.total_recipients);

            return (
              <Card key={c.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{c.name}</CardTitle>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.template && (
                    <p className="text-xs text-muted-foreground truncate">
                      {c.template.subject ?? c.template.name}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Scheduled date */}
                  {c.scheduled_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateTime(c.scheduled_at)}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-1 text-sm font-semibold">
                        {c.total_delivered ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Entregues</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-1 text-sm font-semibold">{openRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Aberturas</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <MousePointerClick className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-1 text-sm font-semibold">{clickRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Cliques</p>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Aberturas</span>
                      <span>{openRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(openRate, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Cliques</span>
                      <span>{clickRate}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(clickRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {c.status === "scheduled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={cancelCampaign.isPending}
                        onClick={() => cancelCampaign.mutate(c.id)}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-xs text-destructive hover:text-destructive"
                      disabled={deleteCampaign.isPending}
                      onClick={() => deleteCampaign.mutate(c.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
