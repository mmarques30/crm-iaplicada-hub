import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, MessageCircle, Send, Instagram, Link2, Edit2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useInstagramAutomations,
  useCreateInstagramAutomation,
  useUpdateInstagramAutomation,
  useDeleteInstagramAutomation,
  type InstagramAutomationInsert,
  type InstagramAutomation,
} from "@/hooks/useInstagramAutomations";
import { formatDateTime } from "@/lib/format";

const emptyForm: InstagramAutomationInsert = {
  post_url: "",
  post_id: null,
  keyword: "",
  comment_reply: "",
  dm_message: "",
  dm_link: null,
  is_active: true,
};

export default function InstagramAutomations() {
  const { toast } = useToast();
  const { data: automations, isLoading } = useInstagramAutomations();
  const createMutation = useCreateInstagramAutomation();
  const updateMutation = useUpdateInstagramAutomation();
  const deleteMutation = useDeleteInstagramAutomation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InstagramAutomationInsert>(emptyForm);
  const [previewOpen, setPreviewOpen] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (auto: InstagramAutomation) => {
    setEditingId(auto.id);
    setForm({
      post_url: auto.post_url,
      post_id: auto.post_id,
      keyword: auto.keyword,
      comment_reply: auto.comment_reply,
      dm_message: auto.dm_message,
      dm_link: auto.dm_link,
      is_active: auto.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.post_url || !form.comment_reply || !form.dm_message) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form });
        toast({ title: "Automação atualizada" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "Automação criada" });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Automação removida" });
    } catch (err) {
      toast({ title: "Erro ao remover", description: String(err), variant: "destructive" });
    }
  };

  const handleToggle = async (auto: InstagramAutomation) => {
    await updateMutation.mutateAsync({ id: auto.id, is_active: !auto.is_active });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Instagram className="h-6 w-6" />
            Automações Instagram
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure respostas automáticas em comentários e envio de DM por post
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Automação" : "Nova Automação"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="post_url">URL do Post *</Label>
                <Input
                  id="post_url"
                  placeholder="https://www.instagram.com/p/ABC123/"
                  value={form.post_url}
                  onChange={(e) => setForm({ ...form, post_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_id">Media ID do Instagram (opcional)</Label>
                <Input
                  id="post_id"
                  placeholder="ID numérico do media (preenchido automaticamente pelo webhook)"
                  value={form.post_id || ""}
                  onChange={(e) => setForm({ ...form, post_id: e.target.value || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Se não souber, deixe em branco. Será preenchido ao receber o primeiro comentário.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword">Palavra-chave (opcional)</Label>
                <Input
                  id="keyword"
                  placeholder="ex: quero, link, eu quero (separar por vírgula)"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Se vazio, responde a todos os comentários deste post. Separe múltiplas palavras por vírgula.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment_reply">Resposta no Comentário *</Label>
                <Textarea
                  id="comment_reply"
                  placeholder="ex: Te mandei no direct! Confere lá 🔥"
                  value={form.comment_reply}
                  onChange={(e) => setForm({ ...form, comment_reply: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dm_message">Mensagem da DM *</Label>
                <Textarea
                  id="dm_message"
                  placeholder="ex: Fala! Aqui está o link que você pediu:"
                  value={form.dm_message}
                  onChange={(e) => setForm({ ...form, dm_message: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dm_link">Link para enviar na DM (opcional)</Label>
                <Input
                  id="dm_link"
                  placeholder="https://seusite.com/oferta"
                  value={form.dm_link || ""}
                  onChange={(e) => setForm({ ...form, dm_link: e.target.value || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Salvar" : "Criar Automação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* How it works */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-pink-500/15 flex items-center justify-center mx-auto">
                <MessageCircle className="h-5 w-5 text-pink-600" />
              </div>
              <p className="text-sm font-medium">1. Comentário</p>
              <p className="text-xs text-muted-foreground">Alguém comenta no post com a palavra-chave</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium">2. Resposta</p>
              <p className="text-xs text-muted-foreground">Bot responde automaticamente no comentário</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium">3. DM</p>
              <p className="text-xs text-muted-foreground">Envia mensagem direta com o link/informação</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automations list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !automations || automations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Instagram className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma automação cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Automação" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((auto) => (
            <Card key={auto.id} className={!auto.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base truncate">{auto.post_url}</CardTitle>
                      {auto.is_active ? (
                        <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs shrink-0">Inativa</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-3 flex-wrap">
                      {auto.keyword && (
                        <span className="flex items-center gap-1">
                          Keyword: <Badge variant="outline" className="text-xs">{auto.keyword}</Badge>
                        </span>
                      )}
                      {!auto.keyword && (
                        <span className="text-xs">Responde a todos os comentários</span>
                      )}
                      <span className="flex items-center gap-1 text-xs">
                        <MessageCircle className="h-3 w-3" />
                        {auto.replies_count} respostas
                      </span>
                      {auto.dm_link && (
                        <span className="flex items-center gap-1 text-xs">
                          <Link2 className="h-3 w-3" />
                          {auto.dm_link}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Switch
                      checked={auto.is_active}
                      onCheckedChange={() => handleToggle(auto)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(previewOpen === auto.id ? null : auto.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(auto)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(auto.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {previewOpen === auto.id && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> Resposta no comentário
                      </p>
                      <p className="text-sm bg-background rounded-lg p-3">{auto.comment_reply}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Send className="h-3 w-3" /> Mensagem DM
                      </p>
                      <div className="text-sm bg-background rounded-lg p-3">
                        <p>{auto.dm_message}</p>
                        {auto.dm_link && (
                          <p className="text-blue-600 mt-1">{auto.dm_link}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criada em {formatDateTime(auto.created_at)}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
