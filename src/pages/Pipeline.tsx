import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatCurrency } from "@/lib/format";
import { qualificationColor, qualificationBadgeVariant } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, Columns3, Search, Filter, X, Building2, Share2, Globe } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type Deal = Tables<"deals"> & {
  contacts: { first_name: string; last_name: string | null; utm_source: string | null; utm_medium: string | null; manychat_id: string | null; hubspot_id: number | null; first_conversion: string | null; instagram_opt_in: boolean; whatsapp_opt_in: boolean } | null;
};

type LeadOriginFilter = "all" | "pipeline" | "social";

// Social = veio de comentário/DM (sem preencher formulário)
// Pipeline = preencheu formulário (HubSpot ou próprio), independente de utm_source
function isDealFromSocial(deal: Deal): boolean {
  if (!deal.contacts) return false;
  const c = deal.contacts;
  // Se preencheu formulário, NÃO é social
  if (c.hubspot_id) return false;
  if (c.first_conversion) return false;
  // Social = interação direta (comentário, DM)
  if (c.instagram_opt_in) return true;
  if (c.whatsapp_opt_in) return true;
  if (c.manychat_id) return true;
  return false;
}
type Stage = Tables<"stages">;

const QUALIFICATION_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "mql", label: "MQL" },
  { value: "sql", label: "SQL" },
];

const CANAL_OPTIONS = [
  "instagram",
  "whatsapp",
  "site",
  "indicação",
  "evento",
  "outro",
];

interface PipelineFilters {
  search: string;
  qualification: string;
  canalOrigem: string;
  amountMin: string;
  amountMax: string;
  leadOrigin: LeadOriginFilter;
}

const emptyFilters: PipelineFilters = {
  search: "",
  qualification: "",
  canalOrigem: "",
  amountMin: "",
  amountMax: "",
  leadOrigin: "all",
};

function PipelineTabs({ product, onSelect }: { product: string; onSelect: (v: string) => void }) {
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipelines")
        .select("id, name, product")
        .order("created_at");
      return (data || []).filter((p: any) => p.product !== "skills");
    },
  });

  return (
    <Tabs value={product} onValueChange={onSelect}>
      <TabsList>
        {(pipelines || []).map((p: any) => (
          <TabsTrigger key={p.id} value={p.product}>{p.name}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default function Pipeline() {
  const { product = "business" } = useParams<{ product: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PipelineFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const { data: pipeline, isLoading: pipelineLoading, isError: pipelineError, refetch: refetchPipeline } = useQuery({
    queryKey: ["pipeline", product],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipelines")
        .select("id")
        .eq("product", product as any)
        .single();
      return data;
    },
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["stages", pipeline?.id],
    enabled: !!pipeline?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("stages")
        .select("*")
        .eq("pipeline_id", pipeline!.id)
        .order("display_order");
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["deals", pipeline?.id],
    enabled: !!pipeline?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, contacts(first_name, last_name, utm_source, utm_medium, manychat_id, hubspot_id, first_conversion, instagram_opt_in, whatsapp_opt_in)")
        .eq("pipeline_id", pipeline!.id);
      return (data as Deal[]) || [];
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals", pipeline?.id] }),
  });

  // Apply filters to deals
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((d) => {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const contactName = d.contacts
          ? `${d.contacts.first_name} ${d.contacts.last_name || ""}`.toLowerCase()
          : "";
        const dealName = d.name.toLowerCase();
        if (!dealName.includes(term) && !contactName.includes(term)) return false;
      }
      if (filters.qualification && d.qualification_status !== filters.qualification) return false;
      if (filters.canalOrigem && d.canal_origem !== filters.canalOrigem) return false;
      if (filters.amountMin && (Number(d.amount) || 0) < Number(filters.amountMin)) return false;
      if (filters.amountMax && (Number(d.amount) || 0) > Number(filters.amountMax)) return false;
      if (filters.leadOrigin === "social" && !isDealFromSocial(d)) return false;
      if (filters.leadOrigin === "pipeline" && isDealFromSocial(d)) return false;
      return true;
    });
  }, [deals, filters]);

  const activeStages = useMemo(() => stages?.filter((s) => !s.is_won && !s.is_lost) || [], [stages]);
  const closedStages = useMemo(() => stages?.filter((s) => s.is_won || s.is_lost) || [], [stages]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    (stages || []).forEach((s) => (map[s.id] = []));
    filteredDeals.forEach((d) => {
      if (map[d.stage_id]) map[d.stage_id].push(d);
    });
    return map;
  }, [filteredDeals, stages]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStageId = result.destination.droppableId;
    if (result.source.droppableId === newStageId) return;
    updateStage.mutate({ dealId, stageId: newStageId });
  };

  const daysInStage = (d: Deal) => {
    if (!d.stage_entered_at) return 0;
    return Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / 86400000);
  };

  const stageTotal = (stageId: string) =>
    (dealsByStage[stageId] || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const totalDeals = filteredDeals.length;
  const totalValue = filteredDeals.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const isLoading = pipelineLoading || stagesLoading;

  const updateFilter = (key: keyof PipelineFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(emptyFilters);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {totalDeals} negócios &middot; {formatCurrency(totalValue)} total
          </p>
        </div>
        <PipelineTabs product={product} onSelect={(v) => { navigate(`/pipeline/${v}`); setFilters(emptyFilters); }} />
      </div>

      {/* Lead Origin Tabs */}
      <Tabs value={filters.leadOrigin} onValueChange={(v) => updateFilter("leadOrigin", v)}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="all" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Pipeline / Formulário
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Redes Sociais
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar deal ou contato..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > (filters.search ? 1 : 0) && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount - (filters.search ? 1 : 0)}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Qualificação</label>
            <Select value={filters.qualification} onValueChange={(v) => updateFilter("qualification", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {QUALIFICATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Canal de Origem</label>
            <Select value={filters.canalOrigem} onValueChange={(v) => updateFilter("canalOrigem", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CANAL_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Valor Mínimo (R$)</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.amountMin}
              onChange={(e) => updateFilter("amountMin", e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Valor Máximo (R$)</label>
            <Input
              type="number"
              placeholder="Sem limite"
              value={filters.amountMax}
              onChange={(e) => updateFilter("amountMax", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {pipelineError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Columns3 className="h-12 w-12 opacity-30" />
          <p className="text-sm">Erro ao carregar pipeline</p>
          <Button variant="outline" size="sm" onClick={() => refetchPipeline()}>Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 flex flex-col">
              <Skeleton className="h-14 rounded-t-lg rounded-b-none" />
              <div className="flex-1 p-2 space-y-2 border border-t-0 rounded-b-lg">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          {activeStages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Columns3 className="h-12 w-12 opacity-30" />
              <p className="text-sm">Nenhum estágio configurado para este pipeline</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-thin">
                {activeStages.map((stage) => (
                  <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] || []} total={stageTotal(stage.id)} daysInStage={daysInStage} navigate={navigate} />
                ))}
              </div>

              {closedStages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Estágios Finais</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    {closedStages.map((stage) => (
                      <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] || []} total={stageTotal(stage.id)} daysInStage={daysInStage} navigate={navigate} isClosed />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DragDropContext>
      )}
    </div>
  );
}

function KanbanColumn({ stage, deals, total, daysInStage, navigate, isClosed }: {
  stage: Stage;
  deals: Deal[];
  total: number;
  daysInStage: (d: Deal) => number;
  navigate: (path: string) => void;
  isClosed?: boolean;
}) {
  return (
    <div className={`flex-shrink-0 ${isClosed ? 'w-60' : 'w-72'} flex flex-col`}>
      <div className={`rounded-t-lg px-3 py-2 ${stage.is_won ? 'bg-brand-600/20' : stage.is_lost ? 'bg-destructive/10' : 'bg-muted'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold truncate">{stage.name}</h3>
          <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 rounded-b-lg border border-t-0 min-h-[80px] transition-colors ${snapshot.isDraggingOver ? 'bg-brand-100/50' : 'bg-card'}`}
          >
            {deals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 opacity-50">Nenhum deal</p>
            )}
            {deals.map((deal, i) => (
              <Draggable key={deal.id} draggableId={deal.id} index={i}>
                {(prov) => (
                  <Card
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={`p-3 cursor-pointer border-l-4 hover:shadow-md transition-shadow ${qualificationColor(deal.qualification_status)}`}
                    onClick={() => navigate(`/deals/${deal.id}`)}
                  >
                    <p className="text-sm font-medium truncate">{deal.name}</p>
                    {deal.contacts && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {deal.contacts.first_name} {deal.contacts.last_name || ""}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-semibold text-primary">{formatCurrency(Number(deal.amount))}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {daysInStage(deal)}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge className={`text-[10px] ${qualificationBadgeVariant(deal.qualification_status)}`}>
                        {deal.qualification_status.toUpperCase()}
                      </Badge>
                      {deal.canal_origem && (
                        <span className="text-[10px] text-muted-foreground">{deal.canal_origem}</span>
                      )}
                    </div>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
