import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle } from "lucide-react";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ciwdlceyjsnlnunktqzx.supabase.co";

const COLOR_MAP: Record<string, { gradient: string; button: string }> = {
  purple: { gradient: "from-purple-600 to-purple-800", button: "bg-purple-600 hover:bg-purple-700" },
  blue: { gradient: "from-blue-600 to-blue-800", button: "bg-blue-600 hover:bg-blue-700" },
  emerald: { gradient: "from-emerald-600 to-emerald-800", button: "bg-emerald-600 hover:bg-emerald-700" },
  orange: { gradient: "from-orange-600 to-orange-800", button: "bg-orange-600 hover:bg-orange-700" },
  red: { gradient: "from-red-600 to-red-800", button: "bg-red-600 hover:bg-red-700" },
  pink: { gradient: "from-pink-600 to-pink-800", button: "bg-pink-600 hover:bg-pink-700" },
  indigo: { gradient: "from-indigo-600 to-indigo-800", button: "bg-indigo-600 hover:bg-indigo-700" },
  cyan: { gradient: "from-cyan-600 to-cyan-800", button: "bg-cyan-600 hover:bg-cyan-700" },
};

const BG_STYLES: Record<string, string> = {
  gradient: "bg-gradient-to-br from-gray-900 to-gray-950",
  solid: "bg-gray-100",
  image: "bg-white",
};

const LAYOUT_CLASSES: Record<string, string> = {
  centered: "max-w-lg mx-auto",
  left: "max-w-lg ml-4 md:ml-16",
  full: "max-w-2xl mx-auto",
};

export default function FormEmbed() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch form config
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ["form-public", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("forms")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch form fields
  const { data: fields } = useQuery({
    queryKey: ["form-fields-public", form?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("form_fields")
        .select("*")
        .eq("form_id", form.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!form?.id,
  });

  // UTMs from URL
  const utms = useMemo(() => ({
    utm_source: searchParams.get("utm_source") || "",
    utm_medium: searchParams.get("utm_medium") || "",
    utm_campaign: searchParams.get("utm_campaign") || "",
    utm_term: searchParams.get("utm_term") || "",
  }), [searchParams]);

  // Pre-fill hidden fields with UTMs
  useEffect(() => {
    if (fields) {
      const hiddenValues: Record<string, string> = {};
      fields.forEach((f: any) => {
        if (f.is_hidden && utms[f.field_name as keyof typeof utms]) {
          hiddenValues[f.field_name] = utms[f.field_name as keyof typeof utms];
        }
      });
      setFormValues((prev) => ({ ...prev, ...hiddenValues }));
    }
  }, [fields, utms]);

  const visibleFields = (fields || []).filter((f: any) => !f.is_hidden);

  // Settings with defaults
  const settings = form?.settings || {};
  const themeColor = settings.theme_color || form?.product || "purple";
  const colors = COLOR_MAP[themeColor] || COLOR_MAP.purple;
  const bgStyle = settings.bg_style || "gradient";
  const layout = settings.layout || "centered";
  const headerTitle = settings.header_title || form?.name || "Formulário";
  const headerSubtitle = settings.header_subtitle || "Preencha seus dados para continuar";
  const ctaText = settings.cta_text || "QUERO CONHECER A IAPLICADA";
  const successMessage = settings.success_message || "Obrigado por se cadastrar. Entraremos em contato em breve.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/form-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_slug: slug,
          fields: formValues,
          utm: {
            source: utms.utm_source,
            medium: utms.utm_medium,
            campaign: utms.utm_campaign,
            term: utms.utm_term,
          },
          meta: {
            referrer: document.referrer,
            page_url: window.location.href,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao enviar formulário");
        return;
      }

      if (result.redirect_url) {
        window.location.href = result.redirect_url;
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (formLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Formulário não encontrado</h1>
          <p className="text-muted-foreground">Este formulário não existe ou está inativo.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${BG_STYLES[bgStyle]}`}>
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Enviado com sucesso!</h1>
          <p className="text-muted-foreground">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${BG_STYLES[bgStyle]} flex items-center justify-center p-4`}>
      <div className={`w-full ${LAYOUT_CLASSES[layout]}`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} rounded-t-2xl p-8 text-white text-center`}>
          <h1 className="text-2xl font-bold mb-1">{headerTitle}</h1>
          {headerSubtitle && (
            <p className="text-white/80 text-sm">{headerSubtitle}</p>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-t-0 rounded-b-2xl p-8 space-y-5"
          data-iaplicada-form={slug}
        >
          {visibleFields.map((field: any) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>

              {field.field_type === "select" ? (
                <Select
                  value={formValues[field.field_name] || ""}
                  onValueChange={(v) =>
                    setFormValues((prev) => ({ ...prev, [field.field_name]: v }))
                  }
                  required={field.required}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.field_type === "textarea" ? (
                <Textarea
                  placeholder={field.placeholder || ""}
                  value={formValues[field.field_name] || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                  }
                  required={field.required}
                />
              ) : field.field_type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formValues[field.field_name] === "true"}
                    onCheckedChange={(checked) =>
                      setFormValues((prev) => ({ ...prev, [field.field_name]: checked ? "true" : "false" }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {field.placeholder || field.label}
                  </span>
                </div>
              ) : (
                <Input
                  type={
                    field.field_type === "email" ? "email"
                    : field.field_type === "phone" ? "tel"
                    : field.field_type === "number" ? "number"
                    : "text"
                  }
                  placeholder={field.placeholder || ""}
                  value={formValues[field.field_name] || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                  }
                  required={field.required}
                />
              )}
            </div>
          ))}

          {/* Hidden UTM fields */}
          {(fields || [])
            .filter((f: any) => f.is_hidden)
            .map((field: any) => (
              <input
                key={field.id}
                type="hidden"
                name={field.field_name}
                value={formValues[field.field_name] || ""}
              />
            ))}

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className={`w-full h-12 text-base font-semibold text-white ${colors.button}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              ctaText
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Ao enviar, você concorda com nossa política de privacidade.
          </p>
        </form>
      </div>
    </div>
  );
}
