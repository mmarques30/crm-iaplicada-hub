import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Plus, Copy, ExternalLink, BarChart3, Eye, Settings2,
  Code, Link2, ClipboardCopy, CheckCircle2, Clock, TrendingUp
} from "lucide-react";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ciwdlceyjsnlnunktqzx.supabase.co";

export default function Forms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch forms
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["forms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch form metrics (submissions count per form)
  const { data: submissions } = useQuery({
    queryKey: ["form-submissions-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("form_submissions")
        .select("id, form_id, submitted_at, utm_source, utm_medium, contact_id, qualification_result")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle form active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("forms")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Formulário atualizado");
    },
  });

  // Compute metrics
  const getFormMetrics = (formId: string) => {
    const formSubs = (submissions || []).filter((s: any) => s.form_id === formId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: formSubs.length,
      last7d: formSubs.filter((s: any) => new Date(s.submitted_at) >= sevenDaysAgo).length,
      last30d: formSubs.filter((s: any) => new Date(s.submitted_at) >= thirtyDaysAgo).length,
      lastSubmission: formSubs[0]?.submitted_at || null,
      sources: [...new Set(formSubs.map((s: any) => s.utm_source).filter(Boolean))],
    };
  };

  const totalSubmissions = submissions?.length || 0;
  const last7dTotal = (submissions || []).filter((s: any) => {
    const d = new Date(s.submitted_at);
    return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getApiEndpoint = (slug: string) =>
    `${SUPABASE_URL}/functions/v1/form-submit`;

  const getEmbedScript = (slug: string, formId: string) =>
    `<script>
(function() {
  var FORM_URL = "${SUPABASE_URL}/functions/v1/form-submit";
  var FORM_SLUG = "${slug}";

  // Capturar UTMs da URL
  var params = new URLSearchParams(window.location.search);
  var utms = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || ''
  };

  // Persistir UTMs em cookie
  document.cookie = 'iaplicada_utms=' + JSON.stringify(utms) + '; max-age=2592000; path=/';

  // Preencher campos hidden automaticamente
  document.addEventListener('DOMContentLoaded', function() {
    var form = document.querySelector('[data-iaplicada-form="${slug}"]');
    if (!form) return;

    Object.keys(utms).forEach(function(key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (input) input.value = utms[key];
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var data = new FormData(form);
      var fields = {};
      data.forEach(function(v, k) { fields[k] = v; });

      fetch(FORM_URL + '?slug=' + FORM_SLUG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_slug: FORM_SLUG,
          fields: fields,
          utm: utms,
          meta: { referrer: document.referrer, page_url: window.location.href }
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.redirect_url) window.location.href = res.redirect_url;
        else alert('Formulário enviado com sucesso!');
      })
      .catch(function() { alert('Erro ao enviar. Tente novamente.'); });
    });
  });
})();
</script>`;

  const getDirectLink = (slug: string) =>
    `${window.location.origin}/form/${slug}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formulários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os formulários de captação de leads — substitui HubSpot Forms
          </p>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Formulários</CardDescription>
            <CardTitle className="text-2xl">{forms?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Envios</CardDescription>
            <CardTitle className="text-2xl">{totalSubmissions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Últimos 7 dias</CardDescription>
            <CardTitle className="text-2xl">{last7dTotal}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Formulários Ativos</CardDescription>
            <CardTitle className="text-2xl">
              {forms?.filter((f: any) => f.is_active).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Formulários
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Envios
          </TabsTrigger>
          <TabsTrigger value="integration" className="gap-1.5">
            <Code className="h-3.5 w-3.5" />
            Integração
          </TabsTrigger>
        </TabsList>

        {/* Forms overview */}
        <TabsContent value="overview" className="space-y-4">
          {formsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <div className="grid gap-4">
              {(forms || []).map((form: any) => {
                const metrics = getFormMetrics(form.id);
                return (
                  <Card key={form.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{form.name}</h3>
                            <Badge variant={form.is_active ? "default" : "secondary"}>
                              {form.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {form.product}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {metrics.total} envios
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5" />
                              {metrics.last7d} últimos 7d
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Último: {metrics.lastSubmission ? formatDate(metrics.lastSubmission) : "—"}
                            </span>
                          </div>
                          {metrics.sources.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {metrics.sources.slice(0, 5).map((src: string) => (
                                <Badge key={src} variant="outline" className="text-[10px]">{src}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={form.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: form.id, is_active: checked })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/form/${form.slug}`, '_blank')}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(getDirectLink(form.slug), `link-${form.id}`)}
                          >
                            {copiedId === `link-${form.id}` ? (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Link
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Submissions */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Formulário</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>UTM Source</TableHead>
                  <TableHead>UTM Medium</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!submissions || submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Nenhum envio ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.slice(0, 50).map((sub: any) => {
                    const form = (forms || []).find((f: any) => f.id === sub.form_id);
                    return (
                      <TableRow
                        key={sub.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => sub.contact_id && navigate(`/contacts/${sub.contact_id}`)}
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {form?.name || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.contact_id ? (
                            <span className="text-primary underline">Ver contato</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.utm_source || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.utm_medium || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(sub.submitted_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Integration */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Endpoint</CardTitle>
              <CardDescription>
                Use este endpoint para receber submissões de formulários de qualquer LP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded text-sm font-mono">
                  POST {getApiEndpoint("")}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getApiEndpoint(""), "api")}
                >
                  {copiedId === "api" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Exemplo de payload JSON:</p>
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">{`{
  "form_slug": "academy",
  "fields": {
    "firstname": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999",
    "renda_mensal": "De R$ 4.001 a R$ 8.000",
    "motivo_para_aprender_ia": "Transição de carreira",
    "objetivo_com_a_comunidade": "Acessar um mentor para acelerar carreira"
  },
  "utm": {
    "source": "instagram",
    "medium": "cpc",
    "campaign": "ia-para-negocios"
  },
  "meta": {
    "referrer": "https://instagram.com",
    "page_url": "https://academy.iaplicada.com/lp"
  }
}`}</pre>
              </div>
            </CardContent>
          </Card>

          {(forms || []).map((form: any) => (
            <Card key={form.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed: {form.name}
                </CardTitle>
                <CardDescription>
                  Cole este script na sua Landing Page para capturar leads automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Link direto do formulário:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getDirectLink(form.slug), `direct-${form.id}`)}
                    >
                      {copiedId === `direct-${form.id}` ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      Copiar link
                    </Button>
                  </div>
                  <code className="block bg-muted p-2 rounded text-xs font-mono break-all">
                    {getDirectLink(form.slug)}?utm_source=instagram&utm_medium=cpc&utm_campaign=nome
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Script embed para LP:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getEmbedScript(form.slug, form.id), `embed-${form.id}`)}
                    >
                      {copiedId === `embed-${form.id}` ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      Copiar script
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-48">
                    {getEmbedScript(form.slug, form.id)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
