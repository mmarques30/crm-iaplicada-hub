import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, MessageSquare, Mail, Calendar, Mic, Database, Instagram } from "lucide-react";
import { productLabel } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const integrations = [
  { name: "HubSpot", icon: Database, status: "Desconectado", description: "Sincronize contatos e deals" },
  { name: "Instagram", icon: Instagram, status: "Configurável", description: "Automação de comentários e DM" },
  { name: "Gmail", icon: Mail, status: "Desconectado", description: "Envio de emails" },
  { name: "Google Calendar", icon: Calendar, status: "Desconectado", description: "Agendamento de reuniões" },
  { name: "Granola", icon: Mic, status: "Desconectado", description: "Notas de reunião com IA" },
];

export default function Settings() {
  const { data: pipelines, isLoading } = useQuery({
    queryKey: ["pipelines_with_stages"],
    queryFn: async () => {
      const { data: pips } = await supabase.from("pipelines").select("*").order("product");
      const { data: stgs } = await supabase.from("stages").select("*").order("display_order");
      return (pips || []).map((p) => ({
        ...p,
        stages: (stgs || []).filter((s) => s.pipeline_id === p.id),
      }));
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie pipelines, notificações e integrações</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pipelines</h2>
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
    </div>
  );
}
