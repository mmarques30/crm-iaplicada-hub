import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Save,
  Sparkles,
  Mail,
  Copy,
  Eye,
  Code,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const AI_SAMPLE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4}
.container{max-width:600px;margin:0 auto;background:#ffffff}
.header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 30px;text-align:center}
.header h1{color:#ffffff;margin:0;font-size:24px;font-weight:600}
.header p{color:#a0a0b0;margin:8px 0 0;font-size:14px}
.content{padding:30px}
.content h2{color:#1a1a2e;font-size:20px;margin:0 0 16px}
.content p{color:#4a4a5a;font-size:15px;line-height:1.6;margin:0 0 16px}
.cta{display:inline-block;background:#6366f1;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0}
.footer{background:#f8f8fa;padding:20px 30px;text-align:center;font-size:12px;color:#888}
</style></head>
<body><div class="container">
<div class="header"><h1>IAplicada</h1><p>Inteligência Artificial Aplicada</p></div>
<div class="content">
<h2>Olá, {{contact.first_name}}!</h2>
<p>[Conteúdo do email aqui - gerado pela IA baseado na sua descrição]</p>
<p>Estamos animados em ter você conosco. Este é o primeiro passo para transformar sua empresa com inteligência artificial.</p>
<a href="#" class="cta">Agendar Diagnóstico</a>
<p>Se tiver qualquer dúvida, responda este email ou entre em contato pelo WhatsApp.</p>
<p>Um abraço,<br><strong>Mariana Marques</strong><br>IAplicada</p>
</div>
<div class="footer">
<p>IAplicada - Inteligência Artificial para Negócios</p>
<p>Você recebeu este email porque se inscreveu em nosso programa.</p>
</div></div></body></html>`;

interface TemplateForm {
  name: string;
  subject: string;
  preview_text: string;
  from_name: string;
  from_email: string;
  type: string;
  status: string;
  product: string;
  tags: string;
  html_body: string;
  text_body: string;
}

const TOKENS = [
  { token: "{{contact.first_name}}", label: "Nome" },
  { token: "{{contact.email}}", label: "Email" },
  { token: "{{contact.company}}", label: "Empresa" },
];

const EmailTemplateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<TemplateForm>({
    name: "",
    subject: "",
    preview_text: "",
    from_name: "",
    from_email: "",
    type: "",
    status: "draft",
    product: "",
    tags: "",
    html_body: "",
    text_body: "",
  });

  const [editorTab, setEditorTab] = useState<string>("code");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("Profissional");
  const [aiType, setAiType] = useState("Confirmação");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [aiFixing, setAiFixing] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ["email_template_v2", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates_v2")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || "",
        subject: template.subject || "",
        preview_text: template.preview_text || "",
        from_name: template.from_name || "",
        from_email: template.from_email || "",
        type: template.type || "",
        status: template.status || "draft",
        product: template.product || "",
        tags: Array.isArray(template.tags) ? template.tags.join(", ") : template.tags || "",
        html_body: template.html_body || "",
        text_body: template.text_body || "",
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("email_templates_v2")
        .update({
          name: form.name,
          subject: form.subject,
          preview_text: form.preview_text,
          from_name: form.from_name,
          from_email: form.from_email,
          type: form.type,
          status: form.status,
          product: form.product,
          tags: tagsArray,
          html_body: form.html_body,
          text_body: form.text_body,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template salvo com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["email_template_v2", id] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const updateField = (field: keyof TemplateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const insertToken = (token: string, target: "subject" | "body") => {
    if (target === "body" && bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue =
        form.html_body.substring(0, start) + token + form.html_body.substring(end);
      updateField("html_body", newValue);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else if (target === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? form.subject.length;
      const end = el.selectionEnd ?? form.subject.length;
      const newValue =
        form.subject.substring(0, start) + token + form.subject.substring(end);
      updateField("subject", newValue);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  };

  const handleAiGenerate = () => {
    setAiGenerating(true);
    toast.info("Gerando email com IA...");
    setTimeout(() => {
      updateField("html_body", AI_SAMPLE_HTML);
      setAiGenerating(false);
      setAiDialogOpen(false);
      toast.success("Email gerado com sucesso!");
    }, 1500);
  };

  const openInGmail = () => {
    const subject = encodeURIComponent(form.subject);
    const body = encodeURIComponent(
      form.text_body || form.html_body.replace(/<[^>]*>/g, "")
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
      "_blank"
    );
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(form.html_body);
      toast.success("HTML copiado para a área de transferência!");
    } catch {
      toast.error("Erro ao copiar HTML.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-[600px] w-[60%]" />
          <Skeleton className="h-[600px] w-[40%]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/email/templates")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editor de Template</h1>
            <p className="text-sm text-muted-foreground">{form.name || "Sem nome"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Gerar Email com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Gerar Email com IA</DialogTitle>
                <DialogDescription>
                  Descreva o email que deseja criar e a IA irá gerar o HTML para você.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ex: Email de confirmação de inscrição no programa Business, tom profissional, com CTA para agendar diagnóstico"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tom</Label>
                    <Select value={aiTone} onValueChange={setAiTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Profissional">Profissional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                        <SelectItem value="Amigável">Amigável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={aiType} onValueChange={setAiType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Confirmação">Confirmação</SelectItem>
                        <SelectItem value="Nurturing">Nurturing</SelectItem>
                        <SelectItem value="Newsletter">Newsletter</SelectItem>
                        <SelectItem value="Promoção">Promoção</SelectItem>
                        <SelectItem value="Follow-up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                  className="gap-2"
                >
                  {aiGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Gerar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2" onClick={copyHtml}>
            <Copy className="h-4 w-4" />
            Copiar HTML
          </Button>

          <Button variant="outline" className="gap-2" onClick={openInGmail}>
            <Mail className="h-4 w-4" />
            Abrir no Gmail
            <ExternalLink className="h-3 w-3" />
          </Button>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Split Panel */}
      <div className="flex gap-4" style={{ minHeight: "calc(100vh - 180px)" }}>
        {/* LEFT - Editor / Preview (60%) */}
        <div className="w-[60%] flex flex-col gap-3">
          {/* Token Buttons for Body */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              Inserir token no corpo:
            </span>
            {TOKENS.map((t) => (
              <Badge
                key={t.token}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => insertToken(t.token, "body")}
              >
                {t.label}
              </Badge>
            ))}
          </div>

          <Tabs value={editorTab} onValueChange={setEditorTab} className="flex-1 flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="code" className="gap-2">
                <Code className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Visualizar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="flex-1 mt-2">
              <Textarea
                ref={bodyRef}
                value={form.html_body}
                onChange={(e) => updateField("html_body", e.target.value)}
                className="w-full h-full min-h-[500px] font-mono text-sm resize-none"
                placeholder="Cole ou edite o HTML do email aqui..."
              />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 mt-2">
              <div className="w-full h-full min-h-[500px] border rounded-lg bg-white">
                <iframe
                  srcDoc={form.html_body}
                  className="w-full h-full border-0 rounded-lg"
                  sandbox="allow-same-origin"
                  title="Preview"
                  style={{ minHeight: "500px" }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT - Settings (40%) */}
        <div className="w-[40%]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Nome do template"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subject">Assunto</Label>
                  <div className="flex gap-1">
                    {TOKENS.map((t) => (
                      <Badge
                        key={t.token}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-[10px] px-1.5 py-0"
                        onClick={() => insertToken(t.token, "subject")}
                      >
                        {t.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Input
                  ref={subjectRef}
                  id="subject"
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="Assunto do email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_text">Texto de Preview</Label>
                <Input
                  id="preview_text"
                  value={form.preview_text}
                  onChange={(e) => updateField("preview_text", e.target.value)}
                  placeholder="Texto de pré-visualização"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="from_name">Nome do Remetente</Label>
                  <Input
                    id="from_name"
                    value={form.from_name}
                    onChange={(e) => updateField("from_name", e.target.value)}
                    placeholder="Ex: IAplicada"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_email">Email do Remetente</Label>
                  <Input
                    id="from_email"
                    value={form.from_email}
                    onChange={(e) => updateField("from_email", e.target.value)}
                    placeholder="Ex: contato@iaplicada.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateField("type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transactional">Transacional</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="nurturing">Nurturing</SelectItem>
                      <SelectItem value="notification">Notificação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => updateField("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Produto</Label>
                <Input
                  id="product"
                  value={form.product}
                  onChange={(e) => updateField("product", e.target.value)}
                  placeholder="Ex: Business, Enterprise"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => updateField("tags", e.target.value)}
                  placeholder="Separadas por vírgula"
                />
                {form.tags && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
