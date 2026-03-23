import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle } from "lucide-react";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://ciwdlceyjsnlnunktqzx.supabase.co";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Enviado com sucesso!</h1>
          <p className="text-muted-foreground">
            Obrigado por se cadastrar. Entraremos em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  const productColors: Record<string, string> = {
    academy: "from-purple-600 to-purple-800",
    business: "from-blue-600 to-blue-800",
    skills: "from-emerald-600 to-emerald-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className={`bg-gradient-to-r ${productColors[form.product] || "from-gray-600 to-gray-800"} rounded-t-2xl p-8 text-white text-center`}>
          <h1 className="text-2xl font-bold mb-1">{form.name}</h1>
          <p className="text-white/80 text-sm">Preencha seus dados para continuar</p>
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
              ) : (
                <Input
                  type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
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
            className="w-full h-12 text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              form.settings?.cta_text || "QUERO CONHECER A IAPLICADA"
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
