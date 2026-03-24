import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, DollarSign, Target, Ticket, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
  "hsl(73, 55%, 34%)",
  "hsl(71, 55%, 39%)",
  "hsl(69, 48%, 45%)",
  "hsl(68, 53%, 50%)",
  "hsl(66, 47%, 57%)",
  "hsl(66, 42%, 65%)",
  "hsl(66, 36%, 75%)",
  "hsl(65, 33%, 85%)",
];

export default function Dashboard() {
  const [product, setProduct] = useState<string>("all");

  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ["product_metrics"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("product_metrics").select("*");
      return (data || []) as any[];
    },
  });

  const { data: stageConversion, isLoading: chartLoading, isError: chartError, refetch: refetchChart } = useQuery({
    queryKey: ["stage_conversion", product],
    queryFn: async () => {
      let q = (supabase as any).from("stage_conversion").select("*").order("display_order");
      if (product !== "all") q = q.eq("product", product);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const totals = metrics?.reduce(
    (acc, m) => {
      if (product !== "all" && m.product !== product) return acc;
      return {
        active: acc.active + (m.active_deals || 0),
        pipeline: acc.pipeline + (m.pipeline_value || 0),
        won: acc.won + (m.won_deals || 0),
        lost: acc.lost + (m.lost_deals || 0),
        avgSize: acc.avgSize + (m.avg_deal_size || 0),
        count: acc.count + 1,
      };
    },
    { active: 0, pipeline: 0, won: 0, lost: 0, avgSize: 0, count: 0 }
  );

  const winRate = totals && (totals.won + totals.lost) > 0
    ? (totals.won / (totals.won + totals.lost)) * 100
    : 0;
  const avgTicket = totals && totals.count > 0 ? totals.avgSize / totals.count : 0;

  const chartData = product === "all"
    ? Object.values(
        (stageConversion || []).reduce((acc: Record<string, { stage_name: string; deal_count: number; total_amount: number; display_order: number }>, item) => {
          const key = item.stage_name || "";
          if (!acc[key]) acc[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: item.display_order || 0 };
          acc[key].deal_count += item.deal_count || 0;
          acc[key].total_amount += Number(item.total_amount) || 0;
          return acc;
        }, {})
      ).sort((a: any, b: any) => a.display_order - b.display_order)
    : (stageConversion || []).map(s => ({
        stage_name: s.stage_name || "",
        deal_count: s.deal_count || 0,
        total_amount: Number(s.total_amount) || 0,
        display_order: s.display_order || 0,
      }));

  const statCards = [
    { label: "Deals Ativos", value: totals?.active || 0, icon: Target, format: (v: number) => String(v) },
    { label: "Valor no Pipeline", value: totals?.pipeline || 0, icon: DollarSign, format: formatCurrency },
    { label: "Taxa de Conversão", value: winRate, icon: TrendingUp, format: formatPercent },
    { label: "Ticket Médio", value: avgTicket, icon: Ticket, format: formatCurrency },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das vendas</p>
      </div>

      <Tabs value={product} onValueChange={setProduct}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="academy">Academy</TabsTrigger>
        </TabsList>

        <TabsContent value={product} className="mt-4 space-y-6">
          {metricsError ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-destructive">Erro ao carregar métricas</p>
              <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>Tentar novamente</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <div className="text-2xl font-bold">{stat.format(stat.value)}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {chartError ? (
                <div className="h-80 flex flex-col items-center justify-center gap-2">
                  <p className="text-sm text-destructive">Erro ao carregar funil</p>
                  <Button variant="outline" size="sm" onClick={() => refetchChart()}>Tentar novamente</Button>
                </div>
              ) : chartLoading ? (
                <div className="h-80 space-y-4 flex flex-col justify-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-6 flex-1" style={{ maxWidth: `${80 - i * 12}%` }} />
                    </div>
                  ))}
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Nenhum deal cadastrado ainda</p>
                  <p className="text-xs">Crie deals no Pipeline para visualizar o funil</p>
                </div>
              ) : (
                <div className="h-60 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" tick={{ fill: 'hsl(222, 18%, 58%)' }} />
                      <YAxis dataKey="stage_name" type="category" width={140} tick={{ fontSize: 12, fill: 'hsl(222, 18%, 58%)' }} />
                      <Tooltip
                        formatter={(value: number) => [value, "Deals"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 20%, 22%)", backgroundColor: "hsl(220, 40%, 20%)", color: "#fff" }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="deal_count" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
