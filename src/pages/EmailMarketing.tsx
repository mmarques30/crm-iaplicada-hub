import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, FileText, Send, Workflow, Users, Plus, ArrowRight, Eye, MousePointerClick, MailWarning } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPercent } from "@/lib/format";

export default function EmailMarketing() {
  const navigate = useNavigate();

  const { data: templateCount, isLoading: tLoading } = useQuery({
    queryKey: ["email-templates-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("email_templates_v2")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: campaignStats, isLoading: cLoading } = useQuery({
    queryKey: ["email-campaigns-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_campaigns")
        .select("status, total_delivered, total_opened, total_clicked");
      const campaigns = data || [];
      const sent = campaigns.filter((c: any) => c.status === "sent").length;
      const scheduled = campaigns.filter((c: any) => c.status === "scheduled").length;
      const totalDelivered = campaigns.reduce((s: number, c: any) => s + (c.total_delivered || 0), 0);
      const totalOpened = campaigns.reduce((s: number, c: any) => s + (c.total_opened || 0), 0);
      const totalClicked = campaigns.reduce((s: number, c: any) => s + (c.total_clicked || 0), 0);
      return {
        total: campaigns.length,
        sent,
        scheduled,
        delivered: totalDelivered,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
      };
    },
  });

  const { data: workflowStats, isLoading: wLoading } = useQuery({
    queryKey: ["email-workflows-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_workflows")
        .select("is_active, total_enrolled, total_completed");
      const workflows = data || [];
      return {
        total: workflows.length,
        active: workflows.filter((w: any) => w.is_active).length,
        enrolled: workflows.reduce((s: number, w: any) => s + (w.total_enrolled || 0), 0),
      };
    },
  });

  const { data: listCount, isLoading: lLoading } = useQuery({
    queryKey: ["contact-lists-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_lists")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: recentCampaigns } = useQuery({
    queryKey: ["recent-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_campaigns")
        .select("id, name, status, scheduled_at, total_delivered, total_opened, total_clicked")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const isLoading = tLoading || cLoading || wLoading || lLoading;

  const statusLabel: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-[#191D0C] text-[#7A8460]" },
    scheduled: { label: "Agendada", color: "bg-[#040E1A] text-[#4A9FE0]" },
    sending: { label: "Enviando", color: "bg-[#1A1206] text-[#E8A43C]" },
    sent: { label: "Enviada", color: "bg-[#141A04] text-[#AFC040]" },
    cancelled: { label: "Cancelada", color: "bg-[#1A0804] text-[#E8684A]" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Crie templates, agende campanhas e automatize sequências de email
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/email/templates")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Templates</p>
                    <p className="text-2xl font-bold">{templateCount}</p>
                  </div>
                   <div className="w-10 h-10 rounded-lg bg-[#141A04] flex items-center justify-center">
                     <FileText className="h-5 w-5 text-[#AFC040]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/email/campaigns")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Campanhas</p>
                    <p className="text-2xl font-bold">{campaignStats?.total || 0}</p>
                    <div className="flex gap-2 mt-1">
                      {(campaignStats?.scheduled || 0) > 0 && (
                        <Badge className="text-[10px] bg-[#040E1A] text-[#4A9FE0]">{campaignStats?.scheduled} agendadas</Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/email/workflows")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Automações</p>
                    <p className="text-2xl font-bold">{workflowStats?.total || 0}</p>
                    <div className="flex gap-2 mt-1">
                      {(workflowStats?.active || 0) > 0 && (
                        <Badge className="text-[10px] bg-green-100 text-green-700">{workflowStats?.active} ativas</Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/email/lists")}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Listas / Segmentos</p>
                    <p className="text-2xl font-bold">{listCount}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Global Metrics */}
      {!isLoading && campaignStats && (campaignStats.delivered > 0) && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Entregues</p>
                <p className="text-xl font-bold">{campaignStats.delivered.toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Abertura</p>
                <p className="text-xl font-bold">{formatPercent(campaignStats.openRate)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <MousePointerClick className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa de Cliques</p>
                <p className="text-xl font-bold">{formatPercent(campaignStats.clickRate)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={() => navigate("/email/templates")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <Plus className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Criar Template</p>
              <p className="text-xs text-muted-foreground">Crie um email com HTML ou peça para a IA gerar</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={() => navigate("/email/campaigns")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Send className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Agendar Campanha</p>
              <p className="text-xs text-muted-foreground">Envie um broadcast para suas listas</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed" onClick={() => navigate("/email/workflows")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Workflow className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Criar Automação</p>
              <p className="text-xs text-muted-foreground">Configure sequências automáticas por gatilho</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      {recentCampaigns && recentCampaigns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campanhas Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/email/campaigns")} className="gap-1 text-xs">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCampaigns.map((c: any) => {
                const s = statusLabel[c.status] || statusLabel.draft;
                const openRate = c.total_delivered > 0 ? (c.total_opened / c.total_delivered) * 100 : 0;
                const clickRate = c.total_delivered > 0 ? (c.total_clicked / c.total_delivered) * 100 : 0;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-[10px] ${s.color}`}>{s.label}</Badge>
                          {c.total_delivered > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {c.total_delivered} entregues
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {c.total_delivered > 0 && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {formatPercent(openRate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" /> {formatPercent(clickRate)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
