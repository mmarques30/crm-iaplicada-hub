import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency } from "@/lib/format";
import { qualificationBadgeVariant } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail, Phone, Building2, FileText, MessageSquare, Video, StickyNote, ArrowRightLeft, Clock, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const activityIcons: Record<string, any> = {
  email: Mail, whatsapp: MessageSquare, call: Phone, meeting: Video, note: StickyNote, stage_change: ArrowRightLeft,
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data } = await supabase.from("deals_full").select("*").eq("id", id!).single();
      return data;
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <FileX className="h-16 w-16 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Deal não encontrado</h2>
        <p className="text-sm text-muted-foreground">O deal pode ter sido removido ou você não tem permissão para acessá-lo.</p>
        <Button variant="outline" asChild>
          <Link to="/pipeline/business">Voltar para Pipeline</Link>
        </Button>
      </div>
    );
  }

  const totalStages = stages?.filter(s => !s.is_won && !s.is_lost).length || 1;
  const currentOrder = deal.stage_order || 0;
  const progress = Math.min((currentOrder / totalStages) * 100, 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/pipeline/${deal.product}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{deal.name}</h1>
          <p className="text-sm text-muted-foreground">{deal.pipeline_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações do Deal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(Number(deal.amount))}</p>
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
                  <span key={s.id} className={`shrink-0 ${s.id === deal.stage_id ? 'text-primary font-semibold' : ''}`}>
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
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {(deal.contact_first_name || "?")[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deal.contact_first_name} {deal.contact_last_name || ""}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {deal.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{deal.contact_email}</span>}
                      {deal.contact_company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{deal.contact_company}</span>}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
    </div>
  );
}
