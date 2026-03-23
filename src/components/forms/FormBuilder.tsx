import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, ArrowUp, ArrowDown,
  Eye, Save, Settings2, Layers, Palette
} from "lucide-react";
import FormPreview from "./FormPreview";

type FieldType = "text" | "email" | "phone" | "select" | "textarea" | "hidden" | "number" | "checkbox";

interface FormField {
  id?: string;
  field_name: string;
  field_type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  is_hidden: boolean;
  display_order: number;
  options: string[] | null;
  maps_to: string;
  _isNew?: boolean;
  _deleted?: boolean;
}

interface FormData {
  id?: string;
  name: string;
  slug: string;
  product: string;
  redirect_url: string;
  notify_emails: string[];
  is_active: boolean;
  settings: {
    cta_text?: string;
    header_title?: string;
    header_subtitle?: string;
    success_message?: string;
    theme_color?: string;
    layout?: "centered" | "left" | "full";
    show_branding?: boolean;
    bg_style?: "gradient" | "solid" | "image";
    bg_color?: string;
  };
}

interface FormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFormId?: string | null;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "number", label: "Número" },
  { value: "select", label: "Seleção" },
  { value: "textarea", label: "Texto longo" },
  { value: "checkbox", label: "Checkbox" },
  { value: "hidden", label: "Oculto" },
];

const MAPS_TO_OPTIONS = [
  { value: "", label: "Nenhum (campo customizado)" },
  { value: "first_name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "company", label: "Empresa" },
  { value: "cargo", label: "Cargo" },
  { value: "renda_mensal", label: "Renda Mensal" },
  { value: "faixa_de_faturamento", label: "Faixa de Faturamento" },
  { value: "numero_de_liderados", label: "Número de Liderados" },
  { value: "motivo_para_aprender_ia", label: "Motivo para aprender IA" },
  { value: "objetivo_com_a_comunidade", label: "Objetivo com a comunidade" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "utm_term", label: "UTM Term" },
];

const THEME_COLORS = [
  { value: "purple", label: "Roxo", class: "bg-purple-600" },
  { value: "blue", label: "Azul", class: "bg-blue-600" },
  { value: "emerald", label: "Verde", class: "bg-emerald-600" },
  { value: "orange", label: "Laranja", class: "bg-orange-600" },
  { value: "red", label: "Vermelho", class: "bg-red-600" },
  { value: "pink", label: "Rosa", class: "bg-pink-600" },
  { value: "indigo", label: "Índigo", class: "bg-indigo-600" },
  { value: "cyan", label: "Ciano", class: "bg-cyan-600" },
];

const DEFAULT_UTM_FIELDS: FormField[] = [
  { field_name: "utm_source", field_type: "hidden", label: "UTM Source", placeholder: "", required: false, is_hidden: true, display_order: 90, options: null, maps_to: "utm_source" },
  { field_name: "utm_medium", field_type: "hidden", label: "UTM Medium", placeholder: "", required: false, is_hidden: true, display_order: 91, options: null, maps_to: "utm_medium" },
  { field_name: "utm_campaign", field_type: "hidden", label: "UTM Campaign", placeholder: "", required: false, is_hidden: true, display_order: 92, options: null, maps_to: "utm_campaign" },
  { field_name: "utm_term", field_type: "hidden", label: "UTM Term", placeholder: "", required: false, is_hidden: true, display_order: 93, options: null, maps_to: "utm_term" },
];

export default function FormBuilder({ open, onOpenChange, editFormId }: FormBuilderProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("fields");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    product: "academy",
    redirect_url: "",
    notify_emails: [],
    is_active: true,
    settings: {
      cta_text: "ENVIAR",
      header_title: "",
      header_subtitle: "Preencha seus dados para continuar",
      success_message: "Obrigado por se cadastrar. Entraremos em contato em breve.",
      theme_color: "purple",
      layout: "centered",
      show_branding: true,
      bg_style: "gradient",
    },
  });
  const [fields, setFields] = useState<FormField[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load existing form data when editing
  const { data: existingForm } = useQuery({
    queryKey: ["form-edit", editFormId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("id", editFormId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!editFormId,
  });

  const { data: existingFields } = useQuery({
    queryKey: ["form-fields-edit", editFormId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("form_fields")
        .select("*")
        .eq("form_id", editFormId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!editFormId,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingForm) {
      setFormData({
        id: existingForm.id,
        name: existingForm.name,
        slug: existingForm.slug,
        product: existingForm.product,
        redirect_url: existingForm.redirect_url || "",
        notify_emails: existingForm.notify_emails || [],
        is_active: existingForm.is_active,
        settings: {
          cta_text: "ENVIAR",
          header_title: "",
          header_subtitle: "Preencha seus dados para continuar",
          success_message: "Obrigado por se cadastrar. Entraremos em contato em breve.",
          theme_color: "purple",
          layout: "centered",
          show_branding: true,
          bg_style: "gradient",
          ...(existingForm.settings || {}),
        },
      });
    }
  }, [existingForm]);

  useEffect(() => {
    if (existingFields) {
      setFields(
        existingFields.map((f: any) => ({
          id: f.id,
          field_name: f.field_name,
          field_type: f.field_type,
          label: f.label,
          placeholder: f.placeholder || "",
          required: f.required,
          is_hidden: f.is_hidden,
          display_order: f.display_order,
          options: f.options || null,
          maps_to: f.maps_to || "",
        }))
      );
    }
  }, [existingFields]);

  // Reset state when dialog opens for new form
  useEffect(() => {
    if (open && !editFormId) {
      setFormData({
        name: "",
        slug: "",
        product: "academy",
        redirect_url: "",
        notify_emails: [],
        is_active: true,
        settings: {
          cta_text: "ENVIAR",
          header_title: "",
          header_subtitle: "Preencha seus dados para continuar",
          success_message: "Obrigado por se cadastrar. Entraremos em contato em breve.",
          theme_color: "purple",
          layout: "centered",
          show_branding: true,
          bg_style: "gradient",
        },
      });
      setFields([]);
      setActiveTab("fields");
      setEditingFieldIndex(null);
    }
  }, [open, editFormId]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.id
        ? prev.slug
        : name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
    }));
  };

  // Field management
  const addField = () => {
    const visibleFields = fields.filter((f) => !f.is_hidden && !f._deleted);
    const newOrder = visibleFields.length > 0
      ? Math.max(...visibleFields.map((f) => f.display_order)) + 1
      : 1;

    const newField: FormField = {
      field_name: `campo_${Date.now()}`,
      field_type: "text",
      label: "Novo Campo",
      placeholder: "",
      required: false,
      is_hidden: false,
      display_order: newOrder,
      options: null,
      maps_to: "",
      _isNew: true,
    };
    setFields((prev) => [...prev, newField]);
    setEditingFieldIndex(fields.length);
  };

  const addTemplateField = (type: "name" | "email" | "phone" | "company") => {
    const templates: Record<string, Partial<FormField>> = {
      name: { field_name: "firstname", field_type: "text", label: "Nome Completo", placeholder: "Seu nome completo", required: true, maps_to: "first_name" },
      email: { field_name: "email", field_type: "email", label: "E-mail", placeholder: "seu@email.com", required: true, maps_to: "email" },
      phone: { field_name: "phone", field_type: "phone", label: "Telefone com DDD", placeholder: "(11) 99999-9999", required: true, maps_to: "phone" },
      company: { field_name: "company", field_type: "text", label: "Empresa", placeholder: "Nome da empresa", required: false, maps_to: "company" },
    };

    const exists = fields.some((f) => f.field_name === templates[type].field_name && !f._deleted);
    if (exists) {
      toast.error("Este campo já existe no formulário");
      return;
    }

    const visibleFields = fields.filter((f) => !f.is_hidden && !f._deleted);
    const newOrder = visibleFields.length > 0
      ? Math.max(...visibleFields.map((f) => f.display_order)) + 1
      : 1;

    setFields((prev) => [
      ...prev,
      {
        ...templates[type],
        is_hidden: false,
        display_order: newOrder,
        options: null,
        _isNew: true,
      } as FormField,
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => {
      const updated = [...prev];
      if (updated[index].id) {
        updated[index] = { ...updated[index], _deleted: true };
      } else {
        updated.splice(index, 1);
      }
      return updated;
    });
    setEditingFieldIndex(null);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      // Auto-set field_name from label if new
      if (updates.label && updated[index]._isNew) {
        updated[index].field_name = updates.label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");
      }
      return updated;
    });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const visibleIndices = fields
      .map((f, i) => (!f.is_hidden && !f._deleted ? i : -1))
      .filter((i) => i >= 0);
    const currentPos = visibleIndices.indexOf(index);
    if (currentPos < 0) return;

    const swapPos = direction === "up" ? currentPos - 1 : currentPos + 1;
    if (swapPos < 0 || swapPos >= visibleIndices.length) return;

    const swapIndex = visibleIndices[swapPos];
    setFields((prev) => {
      const updated = [...prev];
      const tempOrder = updated[index].display_order;
      updated[index] = { ...updated[index], display_order: updated[swapIndex].display_order };
      updated[swapIndex] = { ...updated[swapIndex], display_order: tempOrder };
      return updated;
    });
  };

  // Save form
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Ensure UTM hidden fields exist
      const existingUtmNames = fields.filter((f) => f.is_hidden && !f._deleted).map((f) => f.field_name);
      const utmFieldsToAdd = DEFAULT_UTM_FIELDS.filter((u) => !existingUtmNames.includes(u.field_name));
      const allFields = [...fields, ...utmFieldsToAdd];

      if (formData.id) {
        // Update existing form
        const { error: formError } = await (supabase as any)
          .from("forms")
          .update({
            name: formData.name,
            slug: formData.slug,
            product: formData.product,
            redirect_url: formData.redirect_url || null,
            notify_emails: formData.notify_emails,
            is_active: formData.is_active,
            settings: formData.settings,
          })
          .eq("id", formData.id);
        if (formError) throw formError;

        // Delete removed fields
        const deletedFields = allFields.filter((f) => f.id && f._deleted);
        for (const field of deletedFields) {
          const { error } = await (supabase as any)
            .from("form_fields")
            .delete()
            .eq("id", field.id);
          if (error) throw error;
        }

        // Update existing fields
        const existingFieldsToUpdate = allFields.filter((f) => f.id && !f._deleted);
        for (const field of existingFieldsToUpdate) {
          const { error } = await (supabase as any)
            .from("form_fields")
            .update({
              field_name: field.field_name,
              field_type: field.field_type,
              label: field.label,
              placeholder: field.placeholder || null,
              required: field.required,
              is_hidden: field.is_hidden,
              display_order: field.display_order,
              options: field.options,
              maps_to: field.maps_to || null,
            })
            .eq("id", field.id);
          if (error) throw error;
        }

        // Insert new fields
        const newFields = allFields.filter((f) => !f.id && !f._deleted);
        if (newFields.length > 0) {
          const { error } = await (supabase as any)
            .from("form_fields")
            .insert(
              newFields.map((f) => ({
                form_id: formData.id,
                field_name: f.field_name,
                field_type: f.field_type,
                label: f.label,
                placeholder: f.placeholder || null,
                required: f.required,
                is_hidden: f.is_hidden,
                display_order: f.display_order,
                options: f.options,
                maps_to: f.maps_to || null,
              }))
            );
          if (error) throw error;
        }
      } else {
        // Create new form
        const { data: newForm, error: formError } = await (supabase as any)
          .from("forms")
          .insert({
            name: formData.name,
            slug: formData.slug,
            product: formData.product,
            redirect_url: formData.redirect_url || null,
            notify_emails: formData.notify_emails,
            is_active: formData.is_active,
            settings: formData.settings,
          })
          .select()
          .single();
        if (formError) throw formError;

        // Insert all fields
        const activeFields = allFields.filter((f) => !f._deleted);
        if (activeFields.length > 0) {
          const { error } = await (supabase as any)
            .from("form_fields")
            .insert(
              activeFields.map((f) => ({
                form_id: newForm.id,
                field_name: f.field_name,
                field_type: f.field_type,
                label: f.label,
                placeholder: f.placeholder || null,
                required: f.required,
                is_hidden: f.is_hidden,
                display_order: f.display_order,
                options: f.options,
                maps_to: f.maps_to || null,
              }))
            );
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-edit"] });
      queryClient.invalidateQueries({ queryKey: ["form-fields-edit"] });
      toast.success(formData.id ? "Formulário atualizado!" : "Formulário criado!");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    },
  });

  const visibleFields = fields
    .filter((f) => !f.is_hidden && !f._deleted)
    .sort((a, b) => a.display_order - b.display_order);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (trimmed && !formData.notify_emails.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        notify_emails: [...prev.notify_emails, trimmed],
      }));
      setEmailInput("");
    }
  };

  const removeEmail = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      notify_emails: prev.notify_emails.filter((e) => e !== email),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {formData.id ? "Editar Formulário" : "Criar Novo Formulário"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="fields" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="style" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* === FIELDS TAB === */}
          <TabsContent value="fields" className="space-y-4 mt-4">
            {/* Quick add templates */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Campos rápidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addTemplateField("name")}>
                  + Nome
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTemplateField("email")}>
                  + E-mail
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTemplateField("phone")}>
                  + Telefone
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTemplateField("company")}>
                  + Empresa
                </Button>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Campo personalizado
                </Button>
              </div>
            </div>

            <Separator />

            {/* Field list */}
            <div className="space-y-2">
              {visibleFields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhum campo ainda</p>
                  <p className="text-sm">Use os botões acima para adicionar campos ao formulário</p>
                </div>
              ) : (
                visibleFields.map((field) => {
                  const realIndex = fields.indexOf(field);
                  const isEditing = editingFieldIndex === realIndex;
                  const posInVisible = visibleFields.indexOf(field);

                  return (
                    <Card
                      key={realIndex}
                      className={`transition-colors cursor-pointer ${isEditing ? "border-primary ring-1 ring-primary/20" : "hover:border-muted-foreground/30"}`}
                      onClick={() => setEditingFieldIndex(isEditing ? null : realIndex)}
                    >
                      <CardContent className="p-4">
                        {/* Field header row */}
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{field.label}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type}
                              </Badge>
                              {field.required && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {field.field_name}
                              {field.maps_to ? ` → ${field.maps_to}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={posInVisible === 0}
                              onClick={(e) => { e.stopPropagation(); moveField(realIndex, "up"); }}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={posInVisible === visibleFields.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveField(realIndex, "down"); }}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); removeField(realIndex); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded field editor */}
                        {isEditing && (
                          <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Label (exibido no form)</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(realIndex, { label: e.target.value })}
                                  placeholder="Ex: Nome Completo"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Nome interno</Label>
                                <Input
                                  value={field.field_name}
                                  onChange={(e) =>
                                    updateField(realIndex, { field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })
                                  }
                                  placeholder="ex: nome_completo"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Tipo de campo</Label>
                                <Select
                                  value={field.field_type}
                                  onValueChange={(v) => updateField(realIndex, { field_type: v as FieldType })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPES.filter((t) => t.value !== "hidden").map((t) => (
                                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Placeholder</Label>
                                <Input
                                  value={field.placeholder}
                                  onChange={(e) => updateField(realIndex, { placeholder: e.target.value })}
                                  placeholder="Texto placeholder..."
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Mapeia para (contato)</Label>
                                <Select
                                  value={field.maps_to || "none"}
                                  onValueChange={(v) => updateField(realIndex, { maps_to: v === "none" ? "" : v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MAPS_TO_OPTIONS.map((o) => (
                                      <SelectItem key={o.value || "none"} value={o.value || "none"}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Options for select fields */}
                            {field.field_type === "select" && (
                              <div className="space-y-2">
                                <Label className="text-xs">Opções (uma por linha)</Label>
                                <textarea
                                  className="w-full min-h-[80px] text-sm border rounded-md p-2 bg-background"
                                  value={(field.options || []).join("\n")}
                                  onChange={(e) =>
                                    updateField(realIndex, {
                                      options: e.target.value.split("\n").filter(Boolean),
                                    })
                                  }
                                  placeholder={"Opção 1\nOpção 2\nOpção 3"}
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => updateField(realIndex, { required: checked })}
                                />
                                <Label className="text-xs">Obrigatório</Label>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* === SETTINGS TAB === */}
          <TabsContent value="settings" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do formulário</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Formulário - Webinar IA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    }))
                  }
                  placeholder="webinar-ia"
                />
                <p className="text-xs text-muted-foreground">/form/{formData.slug || "..."}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Produto</Label>
                <Select
                  value={formData.product}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, product: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academy">Academy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="skills">Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>URL de redirecionamento (pós-envio)</Label>
                <Input
                  value={formData.redirect_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, redirect_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-mails de notificação</Label>
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@exemplo.com"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                />
                <Button variant="outline" onClick={addEmail}>
                  Adicionar
                </Button>
              </div>
              {formData.notify_emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.notify_emails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 pr-1">
                      {email}
                      <button
                        onClick={() => removeEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>Formulário ativo</Label>
            </div>
          </TabsContent>

          {/* === STYLE TAB === */}
          <TabsContent value="style" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título do header</Label>
                <Input
                  value={formData.settings.header_title || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, header_title: e.target.value },
                    }))
                  }
                  placeholder="Será o nome do form se vazio"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo do header</Label>
                <Input
                  value={formData.settings.header_subtitle || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, header_subtitle: e.target.value },
                    }))
                  }
                  placeholder="Preencha seus dados para continuar"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Texto do botão (CTA)</Label>
                <Input
                  value={formData.settings.cta_text || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, cta_text: e.target.value },
                    }))
                  }
                  placeholder="ENVIAR"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensagem de sucesso</Label>
                <Input
                  value={formData.settings.success_message || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, success_message: e.target.value },
                    }))
                  }
                  placeholder="Obrigado por se cadastrar..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor do tema</Label>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, theme_color: color.value },
                      }))
                    }
                    className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                      formData.settings.theme_color === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Layout</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "centered", label: "Centralizado", desc: "Card centralizado na tela" },
                  { value: "left", label: "À esquerda", desc: "Formulário alinhado à esquerda" },
                  { value: "full", label: "Largura total", desc: "Formulário em largura total" },
                ].map((layout) => (
                  <Card
                    key={layout.value}
                    className={`cursor-pointer transition-all ${
                      formData.settings.layout === layout.value
                        ? "border-primary ring-1 ring-primary/20"
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, layout: layout.value as any },
                      }))
                    }
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-medium">{layout.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{layout.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estilo do fundo</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "gradient", label: "Gradiente escuro" },
                  { value: "solid", label: "Cor sólida" },
                  { value: "image", label: "Limpo (branco)" },
                ].map((bg) => (
                  <Card
                    key={bg.value}
                    className={`cursor-pointer transition-all ${
                      formData.settings.bg_style === bg.value
                        ? "border-primary ring-1 ring-primary/20"
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, bg_style: bg.value as any },
                      }))
                    }
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-medium">{bg.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* === PREVIEW TAB === */}
          <TabsContent value="preview" className="mt-4">
            <FormPreview
              formData={formData}
              fields={fields.filter((f) => !f._deleted)}
            />
          </TabsContent>
        </Tabs>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab("preview")}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formData.name || !formData.slug}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saveMutation.isPending ? "Salvando..." : formData.id ? "Salvar Alterações" : "Criar Formulário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
