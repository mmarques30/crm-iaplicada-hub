import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Loader2, Play, Pause, Clock, Mail, ArrowDown,
  Workflow, Zap, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  form_submission: "Envio de Formulário",
  lifecycle_change: "Mudança de Lifecycle",
  deal_stage_change: "Mudança de Estágio",
  list_membership: "Entrada em Lista",
  manual: "Manual",
};

const DELAY_UNIT_LABELS: Record<string, string> = {
  minutes: "Minutos",
  hours: "Horas",
  days: "Dias",
};

export default function EmailWorkflows() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New workflow form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTriggerType, setNewTriggerType] = useState("");
  const [newProduct, setNewProduct] = useState<string>("");
  const [newAllowReenroll, setNewAllowReenroll] = useState(false);

  // New step form state
  const [newStepType, setNewStepType] = useState("");
  const [newStepTemplateId, setNewStepTemplateId] = useState("");
  const [newStepDelayAmount, setNewStepDelayAmount] = useState<number>(1);
  const [newStepDelayUnit, setNewStepDelayUnit] = useState("hours");

  // Fetch workflows
  const { data: workflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ["email_workflows"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_workflows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch steps for expanded workflow
  const { data: steps, isLoading: stepsLoading } = useQuery({
    queryKey: ["email_workflow_steps", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await (supabase as any)
        .from("email_workflow_steps")
        .select("*")
        .eq("workflow_id", expandedId)
        .order("step_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedId,
  });

  // Fetch automated email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ["email_templates_automated"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_templates_v2")
        .select("id, name")
        .eq("type", "automated")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Create workflow mutation
  const createWorkflow = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: newName,
        description: newDescription || null,
        trigger_type: newTriggerType,
        allow_reenroll: newAllowReenroll,
      };
      if (newProduct) payload.product = newProduct;
      const { data, error } = await (supabase as any)
        .from("email_workflows")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email_workflows"] });
      toast.success("Workflow criado com sucesso!");
      setDialogOpen(false);
      resetNewWorkflowForm();
      setExpandedId(data.id);
    },
    onError: (err: any) => {
      toast.error("Erro ao criar workflow: " + err.message);
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("email_workflows")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_workflows"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar status: " + err.message);
    },
  });

  // Delete workflow mutation
  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("email_workflows")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_workflows"] });
      toast.success("Workflow excluído!");
      if (expandedId) setExpandedId(null);
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir workflow: " + err.message);
    },
  });

  // Add step mutation
  const addStep = useMutation({
    mutationFn: async (workflowId: string) => {
      const currentSteps = steps || [];
      const nextOrder = currentSteps.length > 0
        ? Math.max(...currentSteps.map((s: any) => s.step_order)) + 1
        : 1;

      const payload: any = {
        workflow_id: workflowId,
        step_type: newStepType,
        step_order: nextOrder,
      };

      if (newStepType === "send_email") {
        payload.template_id = newStepTemplateId;
      } else if (newStepType === "delay") {
        payload.delay_amount = newStepDelayAmount;
        payload.delay_unit = newStepDelayUnit;
      }

      const { error } = await (supabase as any)
        .from("email_workflow_steps")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_workflow_steps", expandedId] });
      toast.success("Passo adicionado!");
      resetNewStepForm();
    },
    onError: (err: any) => {
      toast.error("Erro ao adicionar passo: " + err.message);
    },
  });

  // Delete step mutation
  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await (supabase as any)
        .from("email_workflow_steps")
        .delete()
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_workflow_steps", expandedId] });
      toast.success("Passo removido!");
    },
    onError: (err: any) => {
      toast.error("Erro ao remover passo: " + err.message);
    },
  });

  function resetNewWorkflowForm() {
    setNewName("");
    setNewDescription("");
    setNewTriggerType("");
    setNewProduct("");
    setNewAllowReenroll(false);
  }

  function resetNewStepForm() {
    setNewStepType("");
    setNewStepTemplateId("");
    setNewStepDelayAmount(1);
    setNewStepDelayUnit("hours");
  }

  function getStepLabel(step: any) {
    if (step.step_type === "send_email") {
      const template = emailTemplates?.find((t: any) => t.id === step.template_id);
      return template ? template.name : "Email";
    }
    return "Aguardar";
  }

  function getStepDetail(step: any) {
    if (step.step_type === "send_email") {
      return "Enviar email automatizado";
    }
    const unitLabel = DELAY_UNIT_LABELS[step.delay_unit] || step.delay_unit;
    return `${step.delay_amount} ${unitLabel}`;
  }

  if (workflowsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Workflows de Email
          </h1>
          <p className="text-muted-foreground">
            Gerencie automações de email baseadas em gatilhos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Workflow</DialogTitle>
              <DialogDescription>
                Configure um novo workflow de automação de email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="wf-name">Nome</Label>
                <Input
                  id="wf-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do workflow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wf-desc">Descrição</Label>
                <Textarea
                  id="wf-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição do workflow"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Gatilho</Label>
                <Select value={newTriggerType} onValueChange={setNewTriggerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gatilho" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={newProduct} onValueChange={setNewProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="academy">Academy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="wf-reenroll">Permitir Reinscrição</Label>
                <Switch
                  id="wf-reenroll"
                  checked={newAllowReenroll}
                  onCheckedChange={setNewAllowReenroll}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetNewWorkflowForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createWorkflow.mutate()}
                disabled={!newName || !newTriggerType || createWorkflow.isPending}
              >
                {createWorkflow.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Criar Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows list */}
      {(!workflows || workflows.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum workflow criado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf: any) => {
            const isExpanded = expandedId === wf.id;

            return (
              <Card key={wf.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{wf.name}</CardTitle>
                        {wf.description && (
                          <CardDescription>{wf.description}</CardDescription>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Badge variant={wf.is_active ? "default" : "secondary"}>
                        {wf.is_active ? (
                          <><Play className="h-3 w-3 mr-1" /> Ativo</>
                        ) : (
                          <><Pause className="h-3 w-3 mr-1" /> Inativo</>
                        )}
                      </Badge>

                      <Switch
                        checked={wf.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: wf.id, is_active: checked })
                        }
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWorkflow.mutate(wf.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 ml-8">
                    <Badge variant="outline">
                      <Zap className="h-3 w-3 mr-1" />
                      {TRIGGER_TYPE_LABELS[wf.trigger_type] || wf.trigger_type}
                    </Badge>
                    {wf.product && (
                      <Badge variant="outline">{wf.product}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Inscritos: {wf.total_enrolled ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Concluídos: {wf.total_completed ?? 0}
                    </span>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4">
                    {/* Steps timeline */}
                    <h3 className="text-sm font-semibold mb-4">Passos do Workflow</h3>

                    {stepsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="mb-6">
                        {steps && steps.length > 0 ? (
                          steps.map((step: any, index: number) => {
                            const isLast = index === steps.length - 1;
                            const stepLabel =
                              step.step_type === "send_email"
                                ? `Enviar Email: ${getStepLabel(step)}`
                                : "Aguardar";
                            const stepDetail = getStepDetail(step);

                            return (
                              <div key={step.id} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {step.step_type === "send_email" ? (
                                      <Mail className="h-4 w-4" />
                                    ) : (
                                      <Clock className="h-4 w-4" />
                                    )}
                                  </div>
                                  {!isLast && <div className="w-0.5 h-8 bg-border" />}
                                </div>
                                <div className="flex items-center justify-between flex-1 min-h-[2rem]">
                                  <div>
                                    <p className="text-sm font-medium">{stepLabel}</p>
                                    <p className="text-xs text-muted-foreground">{stepDetail}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteStep.mutate(step.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground mb-4">
                            Nenhum passo adicionado ainda.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Add step form */}
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Adicionar Passo
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo do Passo</Label>
                          <Select value={newStepType} onValueChange={setNewStepType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="send_email">Enviar Email</SelectItem>
                              <SelectItem value="delay">Aguardar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newStepType === "send_email" && (
                          <div className="space-y-2">
                            <Label>Template de Email</Label>
                            <Select
                              value={newStepTemplateId}
                              onValueChange={setNewStepTemplateId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o template" />
                              </SelectTrigger>
                              <SelectContent>
                                {emailTemplates?.map((t: any) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {newStepType === "delay" && (
                          <>
                            <div className="space-y-2">
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                min={1}
                                value={newStepDelayAmount}
                                onChange={(e) =>
                                  setNewStepDelayAmount(Number(e.target.value))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unidade</Label>
                              <Select
                                value={newStepDelayUnit}
                                onValueChange={setNewStepDelayUnit}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="minutes">Minutos</SelectItem>
                                  <SelectItem value="hours">Horas</SelectItem>
                                  <SelectItem value="days">Dias</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => addStep.mutate(wf.id)}
                        disabled={
                          !newStepType ||
                          (newStepType === "send_email" && !newStepTemplateId) ||
                          addStep.isPending
                        }
                      >
                        {addStep.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Passo
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
