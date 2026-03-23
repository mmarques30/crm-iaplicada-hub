import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatCurrency, productLabel, qualificationBadgeVariant } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, Briefcase, Globe, MessageSquare, Video, FileText, ArrowRightLeft, StickyNote, ArrowLeft, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const activityIcons: Record<string, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  call: Phone,
  meeting: Video,
  note: StickyNote,
  stage_change: ArrowRightLeft,
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, isLoading, isError } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["contact_activities", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("contact_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["contact_deals", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals_full")
        .select("*")
        .eq("contact_id", id!);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <UserX className="h-16 w-16 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Contato não encontrado</h2>
        <p className="text-sm text-muted-foreground">O contato pode ter sido removido ou você não tem permissão para acessá-lo.</p>
        <Button variant="outline" asChild>
          <Link to="/contacts">Voltar para Contatos</Link>
        </Button>
      </div>
    );
  }

  const infoItems = [
    { icon: Mail, label: "Email", value: contact.email },
    { icon: Phone, label: "Telefone", value: contact.phone },
    { icon: Building2, label: "Empresa", value: contact.company },
    { icon: Briefcase, label: "Cargo", value: contact.cargo },
    { icon: Globe, label: "Faturamento", value: contact.faixa_de_faturamento },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/contacts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{contact.first_name} {contact.last_name || ""}</h1>
          <p className="text-sm text-muted-foreground">{contact.company || "Sem empresa"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm">{item.value || "—"}</p>
                </div>
              </div>
            ))}
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">WhatsApp Opt-in</p>
              <Badge variant={contact.whatsapp_opt_in ? "default" : "secondary"}>
                {contact.whatsapp_opt_in ? "Sim" : "Não"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Produtos de Interesse</p>
              <div className="flex flex-wrap gap-1">
                {contact.produto_interesse?.map((p) => (
                  <Badge key={p} variant="secondary">{productLabel[p] || p}</Badge>
                )) || <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
            {(contact.utm_source || contact.utm_medium || contact.utm_campaign) && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">UTM</p>
                {contact.utm_source && <p className="text-xs">Source: {contact.utm_source}</p>}
                {contact.utm_medium && <p className="text-xs">Medium: {contact.utm_medium}</p>}
                {contact.utm_campaign && <p className="text-xs">Campaign: {contact.utm_campaign}</p>}
                {contact.utm_term && <p className="text-xs">Term: {contact.utm_term}</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{a.subject || a.type}</p>
                          <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                        </div>
                        {a.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deals && deals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Deals</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deals.map((d) => (
                <Link key={d.id} to={`/deals/${d.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.stage_name} · {d.pipeline_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(Number(d.amount))}</p>
                    <Badge className={`text-[10px] ${qualificationBadgeVariant(d.qualification_status || 'lead')}`}>
                      {(d.qualification_status || 'lead').toUpperCase()}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
