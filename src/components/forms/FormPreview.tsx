import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface FormField {
  field_name: string;
  field_type: string;
  label: string;
  placeholder: string;
  required: boolean;
  is_hidden: boolean;
  display_order: number;
  options: string[] | null;
}

interface FormData {
  name: string;
  product: string;
  settings: {
    cta_text?: string;
    header_title?: string;
    header_subtitle?: string;
    theme_color?: string;
    layout?: string;
    bg_style?: string;
  };
}

interface FormPreviewProps {
  formData: FormData;
  fields: FormField[];
}

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
  left: "max-w-lg ml-8",
  full: "max-w-2xl mx-auto",
};

export default function FormPreview({ formData, fields }: FormPreviewProps) {
  const visibleFields = fields
    .filter((f) => !f.is_hidden)
    .sort((a, b) => a.display_order - b.display_order);

  const themeColor = formData.settings.theme_color || "purple";
  const colors = COLOR_MAP[themeColor] || COLOR_MAP.purple;
  const bgStyle = formData.settings.bg_style || "gradient";
  const layout = formData.settings.layout || "centered";
  const headerTitle = formData.settings.header_title || formData.name || "Formulário";
  const headerSubtitle = formData.settings.header_subtitle || "Preencha seus dados para continuar";
  const ctaText = formData.settings.cta_text || "ENVIAR";

  return (
    <div className={`rounded-xl overflow-hidden border ${BG_STYLES[bgStyle]} p-6 min-h-[400px] flex items-start justify-center`}>
      <div className={`w-full ${LAYOUT_CLASSES[layout]}`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} rounded-t-2xl p-6 text-white text-center`}>
          <h1 className="text-xl font-bold mb-1">{headerTitle}</h1>
          {headerSubtitle && (
            <p className="text-white/80 text-sm">{headerSubtitle}</p>
          )}
        </div>

        {/* Form body */}
        <div className="bg-card border border-t-0 rounded-b-2xl p-6 space-y-4">
          {visibleFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Adicione campos na aba "Campos" para ver o preview</p>
            </div>
          ) : (
            visibleFields.map((field, i) => (
              <div key={i} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>

                {field.field_type === "select" ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.field_type === "textarea" ? (
                  <Textarea
                    placeholder={field.placeholder || ""}
                    disabled
                    className="resize-none"
                  />
                ) : field.field_type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox disabled />
                    <span className="text-sm text-muted-foreground">
                      {field.placeholder || field.label}
                    </span>
                  </div>
                ) : (
                  <Input
                    type={
                      field.field_type === "email"
                        ? "email"
                        : field.field_type === "phone"
                        ? "tel"
                        : field.field_type === "number"
                        ? "number"
                        : "text"
                    }
                    placeholder={field.placeholder || ""}
                    disabled
                  />
                )}
              </div>
            ))
          )}

          <Button
            className={`w-full h-12 text-base font-semibold text-white ${colors.button}`}
            disabled
          >
            {ctaText}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Ao enviar, você concorda com nossa política de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
