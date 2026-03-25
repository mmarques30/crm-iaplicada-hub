import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS_BY_ACTION: Record<string, { name: string; description: string; parameters: any; systemPrompt: string }> = {
  generate_nf_data: {
    name: "generate_nf_data",
    description: "Gera descrição de serviço padronizada para nota fiscal e sugere mês de referência",
    parameters: {
      type: "object",
      properties: {
        descricao_servico: { type: "string", description: "Descrição do serviço para a NF, padronizada e profissional" },
        mes_referencia: { type: "string", description: "Mês de referência sugerido no formato YYYY-MM" },
        observacoes: { type: "string", description: "Observações ou alertas sobre os dados fiscais" },
      },
      required: ["descricao_servico", "mes_referencia", "observacoes"],
      additionalProperties: false,
    },
    systemPrompt: `Você é um assistente fiscal brasileiro especializado em emissão de notas fiscais de serviço.
Dado o produto vendido, valor e nome do cliente, gere uma descrição de serviço profissional e padronizada para a NF.
Use linguagem formal e técnica. Inclua o tipo de serviço prestado baseado no produto.
Produtos conhecidos:
- Business: Consultoria e mentoria em gestão empresarial com inteligência artificial
- Academy: Programa de formação e capacitação em inteligência artificial aplicada
- Skills: Treinamento em liderança e habilidades de gestão com IA
- Ferramentas: Licenciamento e acesso a ferramentas de IA para produtividade`,
  },
  validate_fiscal: {
    name: "validate_fiscal",
    description: "Valida consistência de dados fiscais e identifica problemas",
    parameters: {
      type: "object",
      properties: {
        is_valid: { type: "boolean", description: "Se os dados fiscais estão consistentes" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              message: { type: "string" },
              severity: { type: "string", enum: ["error", "warning", "info"] },
            },
            required: ["field", "message", "severity"],
            additionalProperties: false,
          },
        },
        suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["is_valid", "issues", "suggestions"],
      additionalProperties: false,
    },
    systemPrompt: `Você é um auditor fiscal brasileiro. Analise os dados fiscais fornecidos e identifique inconsistências.
Verifique: formato de CPF/CNPJ, compatibilidade entre razão social e tipo de documento, campos obrigatórios faltantes, e valores suspeitos.
CPF tem 11 dígitos, CNPJ tem 14 dígitos. Razão social é obrigatória para CNPJ.`,
  },
  analyze_installments: {
    name: "analyze_installments",
    description: "Analisa parcelas de uma venda e retorna recomendações",
    parameters: {
      type: "object",
      properties: {
        risk_level: { type: "string", enum: ["baixo", "medio", "alto", "critico"] },
        summary: { type: "string", description: "Resumo da situação das parcelas" },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string" },
              reason: { type: "string" },
              priority: { type: "string", enum: ["Alta", "Média", "Baixa"] },
            },
            required: ["action", "reason", "priority"],
            additionalProperties: false,
          },
        },
        metrics: {
          type: "object",
          properties: {
            total_value: { type: "number" },
            paid_value: { type: "number" },
            overdue_value: { type: "number" },
            overdue_days_max: { type: "number" },
            delinquency_rate: { type: "number" },
          },
          required: ["total_value", "paid_value", "overdue_value", "overdue_days_max", "delinquency_rate"],
          additionalProperties: false,
        },
      },
      required: ["risk_level", "summary", "recommendations", "metrics"],
      additionalProperties: false,
    },
    systemPrompt: `Você é um analista financeiro especializado em gestão de recebíveis e cobrança.
Analise as parcelas fornecidas e avalie o risco de inadimplência.
Considere: parcelas vencidas, tempo de atraso, padrão de pagamento, valor total em aberto.
Sugira ações como: renegociação, desconto para antecipação, contato de cobrança, ou encaminhamento jurídico.
Use a data atual para calcular atrasos.`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    if (!action || !data) {
      return new Response(
        JSON.stringify({ error: "Missing action or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolConfig = TOOLS_BY_ACTION[action];
    if (!toolConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
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

    const userPrompt = `Dados para análise:\n${JSON.stringify(data, null, 2)}\n\nData atual: ${new Date().toISOString().substring(0, 10)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: toolConfig.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolConfig.name,
              description: toolConfig.description,
              parameters: toolConfig.parameters,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: toolConfig.name } },
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
      JSON.stringify({ result: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fiscal-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
