import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, MessageSquare, Mail, Calendar, Mic, Database, Instagram, Plus, X, Trash2 } from "lucide-react";
import { productLabel } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

const integrations = [
  { name: "HubSpot", icon: Database, status: "Desconectado", description: "Sincronize contatos e deals" },
  { name: "Instagram", icon: Instagram, status: "Configurável", description: "Automação de comentários e DM" },
  { name: "Gmail", icon: Mail, status: "Desconectado", description: "Envio de emails" },
  { name: "Google Calendar", icon: Calendar, status: "Desconectado", description: "Agendamento de reuniões" },
  { name: "Granola", icon: Mic, status: "Desconectado", description: "Notas de reunião com IA" },
];

interface NewStage {
  name: string;
  is_won: boolean;
  is_lost: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineProduct, setPipelineProduct] = useState("academy");
  const [newStages, setNewStages] = useState<NewStage[]>([
    { name: "", is_won: false, is_lost: false },
  ]);

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ["pipelines_with_stages"],
    queryFn: async () => {
      const { data: pips } = await supabase.from("pipelines").select("*").order("product");
      const { data: stgs } = await supabase.from("stages").select("*").order("display_order");
      return (pips || []).filter((p) => p.product !== "skills").map((p) => ({
        ...p,
        stages: (stgs || []).filter((s) => s.pipeline_id === p.id),
      }));
    },
  });

  const addStage = () => setNewStages((prev) => [...prev, { name: "", is_won: false, is_lost: false }]);
  const removeStage = (i: number) => setNewStages((prev) => prev.filter((_, idx) => idx !== i));
  const updateStage = (i: number, field: keyof NewStage, value: any) =>
    setNewStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const resetDialog = () => {
    setPipelineName("");
    setPipelineProduct("academy");
    setNewStages([{ name: "", is_won: false, is_lost: false }]);
  };

  const handleCreatePipeline = async () => {
    if (!pipelineName.trim()) { toast.error("Nome do pipeline é obrigatório"); return; }
    const validStages = newStages.filter((s) => s.name.trim());
    if (validStages.length === 0) { toast.error("Adicione pelo menos um estágio"); return; }

    setSaving(true);
    try {
      const { data: pipeline, error: pErr } = await supabase
        .from("pipelines")
        .insert({ name: pipelineName.trim(), product: pipelineProduct })
        .select()
        .single();
      if (pErr) throw pErr;

      const stagesToInsert = validStages.map((s, i) => ({
        pipeline_id: pipeline.id,
        name: s.name.trim(),
        display_order: i,
        is_won: s.is_won,
        is_lost: s.is_lost,
        probability: s.is_won ? 100 : s.is_lost ? 0 : Math.round((i / validStages.length) * 100),
      }));

      const { error: sErr } = await supabase.from("stages").insert(stagesToInsert);
      if (sErr) throw sErr;

      toast.success("Pipeline criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipelines_with_stages"] });
      setDialogOpen(false);
      resetDialog();
    } catch (err: any) {
      toast.error("Erro ao criar pipeline: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie pipelines, notificações e integrações</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pipelines</h2>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Pipeline
          </Button>
        </div>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-20 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : pipelines?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pipeline configurado</p>
        ) : (
          pipelines?.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription>{productLabel[p.product] || p.product}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.stages.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1">
                      <Badge
                        variant={s.is_won ? "default" : s.is_lost ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {s.name}
                      </Badge>
                      {i < p.stages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notificações</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[
              { label: "Deals parados por muito tempo", desc: "Receba alertas quando um deal ficar parado" },
              { label: "Novos leads qualificados", desc: "Notificação quando um lead se tornar MQL" },
              { label: "Deals fechados", desc: "Notificação de deals ganhos ou perdidos" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Integrações</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((int) => (
            <Card key={int.name}>
              <CardContent className="pt-6 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <int.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{int.name}</p>
                    <Badge variant="secondary" className="text-xs">{int.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{int.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Dialog Novo Pipeline */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pipeline</DialogTitle>
            <DialogDescription>Crie um pipeline com estágios customizados</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Pipeline</Label>
              <Input placeholder="Ex: Vendas Enterprise" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={pipelineProduct} onValueChange={setPipelineProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academy">Academy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estágios</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addStage}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {newStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                    <Input
                      placeholder="Nome do estágio"
                      value={stage.name}
                      onChange={(e) => updateStage(i, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={stage.is_won ? "won" : stage.is_lost ? "lost" : "active"}
                      onValueChange={(v) => {
                        updateStage(i, "is_won", v === "won");
                        updateStage(i, "is_lost", v === "lost");
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="won">Ganho</SelectItem>
                        <SelectItem value="lost">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                    {newStages.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeStage(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePipeline} disabled={saving}>
              {saving ? "Criando..." : "Criar Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
