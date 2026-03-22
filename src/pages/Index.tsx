import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, DollarSign, Target, Ticket } from "lucide-react";
import { useState } from "react";

const CHART_COLORS = [
  "hsl(73, 58%, 34%)",
  "hsl(68, 56%, 39%)",
  "hsl(67, 52%, 45%)",
  "hsl(68, 53%, 50%)",
  "hsl(65, 48%, 58%)",
  "hsl(65, 44%, 65%)",
  "hsl(65, 38%, 75%)",
  "hsl(65, 34%, 85%)",
];

export default function Dashboard() {
  const [product, setProduct] = useState<string>("all");

  const { data: metrics } = useQuery({
    queryKey: ["product_metrics"],
    queryFn: async () => {
      const { data } = await supabase.from("product_metrics").select("*");
      return data || [];
    },
  });

  const { data: stageConversion } = useQuery({
    queryKey: ["stage_conversion", product],
    queryFn: async () => {
      let q = supabase.from("stage_conversion").select("*").order("display_order");
      if (product !== "all") q = q.eq("product", product as "business" | "skills" | "academy");
      const { data } = await q;
      return data || [];
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

  // Aggregate stage conversion data when "all" is selected
  const chartData = product === "all"
    ? Object.values(
        (stageConversion || []).reduce((acc: Record<string, { stage_name: string; deal_count: number; total_amount: number; display_order: number }>, item) => {
          const key = item.stage_name || "";
          if (!acc[key]) acc[key] = { stage_name: key, deal_count: 0, total_amount: 0, display_order: item.display_order || 0 };
          acc[key].deal_count += item.deal_count || 0;
          acc[key].total_amount += Number(item.total_amount) || 0;
          return acc;
        }, {})
      ).sort((a, b) => a.display_order - b.display_order)
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
    <div className="p-6 space-y-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.format(stat.value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="stage_name" type="category" width={140} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [value, "Deals"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(65, 15%, 88%)" }}
                    />
                    <Bar dataKey="deal_count" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
