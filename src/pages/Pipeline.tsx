import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatCurrency } from "@/lib/format";
import { qualificationColor, qualificationBadgeVariant } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useState, useMemo } from "react";

type Deal = Tables<"deals"> & {
  contacts: { first_name: string; last_name: string | null } | null;
};
type Stage = Tables<"stages">;

export default function Pipeline() {
  const { product = "business" } = useParams<{ product: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pipeline } = useQuery({
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

  const { data: stages } = useQuery({
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
        .select("*, contacts(first_name, last_name)")
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

  const activeStages = useMemo(() => stages?.filter((s) => !s.is_won && !s.is_lost) || [], [stages]);
  const closedStages = useMemo(() => stages?.filter((s) => s.is_won || s.is_lost) || [], [stages]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    (stages || []).forEach((s) => (map[s.id] = []));
    (deals || []).forEach((d) => {
      if (map[d.stage_id]) map[d.stage_id].push(d);
    });
    return map;
  }, [deals, stages]);

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

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <Tabs value={product} onValueChange={(v) => navigate(`/pipeline/${v}`)}>
          <TabsList>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="academy">Academy</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Active stages */}
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 scrollbar-thin">
          {activeStages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id] || []} total={stageTotal(stage.id)} daysInStage={daysInStage} navigate={navigate} />
          ))}
        </div>

        {/* Closed stages */}
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
      </DragDropContext>
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
                    <Badge className={`mt-1.5 text-[10px] ${qualificationBadgeVariant(deal.qualification_status)}`}>
                      {deal.qualification_status.toUpperCase()}
                    </Badge>
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
