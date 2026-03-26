import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Mail, Trash2, Loader2, Sparkles, ExternalLink, Copy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Rascunho</Badge>;
    case "published":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Publicado</Badge>;
    case "archived":
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const typeBadge = (type: string) => {
  switch (type) {
    case "automated":
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Automatizado</Badge>;
    case "broadcast":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Broadcast</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const initialForm = {
  name: "",
  subject: "",
  preview_text: "",
  from_name: "Mariana Marques",
  from_email: "mariana@iaplicada.com",
  type: "automated" as "automated" | "broadcast",
  product: "" as string,
  status: "draft" as "draft" | "published",
  html_body: "",
};

export default function EmailTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email_templates_v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates_v2")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const insertData: Record<string, unknown> = {
        name: payload.name,
        subject: payload.subject,
        preview_text: payload.preview_text,
        from_name: payload.from_name,
        from_email: payload.from_email,
        type: payload.type,
        status: payload.status,
      };
      if (payload.product) {
        insertData.product = payload.product;
      }
      if (payload.html_body) {
        insertData.html_body = payload.html_body;
      }
      const { data, error } = await supabase
        .from("email_templates_v2")
        .insert([insertData] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates_v2"] });
      toast.success("Template criado com sucesso!");
      setDialogOpen(false);
      setForm(initialForm);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates_v2")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates_v2"] });
      toast.success("Template excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir template: " + error.message);
    },
  });

  const handleCreate = () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Nome e Assunto são obrigatórios.");
      return;
    }
    createMutation.mutate(form);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenGmail = (e: React.MouseEvent, template: any) => {
    e.stopPropagation();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.text_body || "Visualize o HTML no editor")}`;
    window.open(gmailUrl, "_blank");
  };

  const [aiGeneratingSubject, setAiGeneratingSubject] = useState(false);

  const handleGenerateAI = async () => {
    if (!form.name.trim()) {
      toast.error("Preencha o nome do template primeiro.");
      return;
    }
    setAiGeneratingSubject(true);
    try {
      const { data, error } = await supabase.functions.invoke("fix-email-html", {
        body: {
          html: "<html><body><p>placeholder</p></body></html>",
          instruction: `Gere APENAS uma linha de assunto de email (subject line) criativa e envolvente para um template chamado "${form.name}". Retorne SOMENTE o texto do assunto, sem HTML, sem tags, sem explicações. Máximo 80 caracteres.`,
        },
      });
      if (error) throw error;
      if (data?.html) {
        // The AI returns HTML, extract just text
        const text = data.html.replace(/<[^>]*>/g, "").trim().split("\n")[0].trim();
        setForm({ ...form, subject: text });
        toast.success("Assunto gerado com IA!");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar assunto: " + (err.message || "Erro desconhecido"));
    } finally {
      setAiGeneratingSubject(false);
    }
  };

  const handleCreateFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Arquivo muito grande (máx. 500KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setForm({ ...form, html_body: content });
      toast.success("HTML importado!");
    };
    reader.onerror = () => toast.error("Erro ao ler o arquivo.");
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Email</h1>
          <p className="text-muted-foreground">
            Gerencie seus templates de email para automações e campanhas.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Preencha os campos abaixo para criar um novo template de email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Boas-vindas Academy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <div className="flex gap-2">
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Ex: Olá {{contact.first_name}}, bem-vindo!"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateAI}
                    title="Gerar com IA"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use tokens como {"{{contact.first_name}}"} para personalização.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_text">Texto de Prévia</Label>
                <Input
                  id="preview_text"
                  value={form.preview_text}
                  onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
                  placeholder="Texto exibido na prévia do email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_name">Remetente Nome</Label>
                  <Input
                    id="from_name"
                    value={form.from_name}
                    onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_email">Remetente Email</Label>
                  <Input
                    id="from_email"
                    value={form.from_email}
                    onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: "automated" | "broadcast") =>
                      setForm({ ...form, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automated">Automatizado</SelectItem>
                      <SelectItem value="broadcast">Broadcast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: "draft" | "published") =>
                      setForm({ ...form, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produto (opcional)</Label>
                <Select
                  value={form.product}
                  onValueChange={(value: string) =>
                    setForm({ ...form, product: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="academy">Academy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>

              <div className="space-y-2">
                <Label>HTML do Email (opcional)</Label>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={handleCreateFileImport}
                />
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  onClick={() => createFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
                      if (file.size > 500 * 1024) {
                        toast.error("Arquivo muito grande (máx. 500KB).");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setForm({ ...form, html_body: ev.target?.result as string });
                        toast.success("HTML importado!");
                      };
                      reader.readAsText(file);
                    } else {
                      toast.error("Apenas arquivos .html ou .htm são aceitos.");
                    }
                  }}
                >
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  {form.html_body ? (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ HTML importado ({Math.round(form.html_body.length / 1024)}KB)
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Arraste um arquivo .html ou clique para importar
                    </p>
                  )}
                </div>
              </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Criar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : templates && templates.length > 0 ? (
              templates.map((template: any) => (
                <TableRow
                  key={template.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/email/templates/${template.id}`)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell>{typeBadge(template.type)}</TableCell>
                  <TableCell>{statusBadge(template.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(template.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Abrir no Gmail"
                        onClick={(e) => handleOpenGmail(e, template)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={(e) => handleDelete(e, template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhum template encontrado. Clique em "Novo Template" para criar o primeiro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
