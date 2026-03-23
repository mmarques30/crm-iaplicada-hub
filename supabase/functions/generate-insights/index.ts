import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um consultor sênior de marketing digital e vendas B2B. Analise os dados fornecidos e gere insights acionáveis em português brasileiro.

Regras:
- Gere entre 5 e 12 insights com base nos dados reais fornecidos
- Cada insight deve ser baseado em um número/métrica real dos dados
- Classifique cada insight corretamente:
  - type: "positive" (métrica boa), "negative" (alerta/problema), "neutral" (oportunidade), "action" (recomendação de ação)
  - priority: "Alta" (impacto direto em receita), "Média" (oportunidade de melhoria), "Baixa" (informativo)
  - product: "Academy", "Business", "Skills", "Ambos" ou "Geral"
- O campo "metric" deve conter apenas o número-chave (ex: "7,1%", "R$158.909", "87 leads")
- O campo "title" deve ser direto e curto (1 linha)
- O campo "description" deve ter 2-3 frases com contexto e recomendação
- Foque em ações concretas, não em observações genéricas
- Use benchmarks de mercado para contextualizar (CTR benchmark ~1-2%, CPL bom < R$50, etc.)`;

const CONTEXT_PROMPTS: Record<string, string> = {
  instagram: "Analise os dados de performance do Instagram. Foque em engajamento, alcance, tipos de conteúdo (reels vs posts), crescimento e oportunidades de conversão.",
  facebook_ads: "Analise os dados de campanhas do Facebook Ads. Foque em CTR, CPL, eficiência de campanhas, distribuição de investimento e otimização de ROAS.",
  crm: "Analise os dados do CRM de vendas. Foque em funil de conversão, win rate, pipeline value, performance por produto e gargalos no funil.",
  financeiro: "Analise os dados financeiros de vendas. Foque em receita por produto, ticket médio, formas de pagamento, evolução mensal e oportunidades de upsell.",
  painel: "Analise os dados consolidados de todos os canais (Instagram, Facebook Ads, CRM). Foque em análise cruzada entre canais, ROI comparativo, funil integrado e recomendações estratégicas.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, data } = await req.json();

    if (!context || !data) {
      return new Response(
        JSON.stringify({ error: "Missing context or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextPrompt = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.painel;
    const userPrompt = `${contextPrompt}\n\nDados para análise:\n${JSON.stringify(data, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Retorna array de insights de marketing/vendas baseados nos dados analisados",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["positive", "negative", "neutral", "action"] },
                        title: { type: "string" },
                        metric: { type: "string" },
                        description: { type: "string" },
                        product: { type: "string", enum: ["Academy", "Business", "Skills", "Ambos", "Geral"] },
                        priority: { type: "string", enum: ["Alta", "Média", "Baixa"] },
                      },
                      required: ["type", "title", "metric", "description", "product", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Erro ao chamar IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ error: "Resposta da IA sem formato esperado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ insights: parsed.insights || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
