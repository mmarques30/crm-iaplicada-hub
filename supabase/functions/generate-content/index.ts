// Edge Function: Gera conteúdo para eventos usando Perplexity (pesquisa) + Claude (mensagens)
// Pipeline: Pesquisa ferramenta → Gera mensagens por comunidade → Gera stories

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PERPLEXITY_KEY = Deno.env.get('PERPLEXITY_API_KEY') || ''
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY') || ''

// ─── Perplexity: pesquisa ferramenta ───
async function researchTool(toolName: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role: 'user',
        content: `Pesquise a ferramenta de IA "${toolName}". Retorne em português brasileiro:
1. O que é e para que serve (2-3 frases)
2. Principais funcionalidades (3-5 bullets)
3. Pricing (gratuito? planos?)
4. Wow-factor: o que torna essa ferramenta especial
5. Caso de uso prático para um profissional brasileiro
Seja conciso e direto. Foque em informação prática e atualizada.`
      }],
      max_tokens: 800,
    }),
  })
  if (!res.ok) throw new Error(`Perplexity error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Pesquisa não disponível'
}

// ─── Perplexity: sugere ferramentas ───
async function suggestTools(category: string, excludeTools: string[]): Promise<any[]> {
  const exclude = excludeTools.length > 0 ? `NÃO inclua: ${excludeTools.join(', ')}.` : ''
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role: 'user',
        content: `Sugira 5 ferramentas de IA de NICHO na categoria "${category}" para ensinar em aula de 60 minutos.
Critérios: ferramentas pouco conhecidas (NÃO ChatGPT, Canva, Midjourney, DALL-E), com resultado prático imediato, acessíveis para brasileiros.
${exclude}
Para cada ferramenta, retorne em formato JSON array:
[{"name":"...", "tagline":"frase curta", "category":"${category}", "wow":"fator uau", "pricing":"gratuito/pago", "useCase":"caso de uso prático"}]
Retorne APENAS o JSON array, sem texto adicional.`
      }],
      max_tokens: 600,
    }),
  })
  if (!res.ok) throw new Error(`Perplexity suggest error: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '[]'
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch {
    return []
  }
}

// ─── Claude: gera mensagens ───
async function generateMessages(
  tool: string,
  toolResearch: string,
  eventType: string,
  date: string,
  communities: Array<{ slug: string; nome: string; tom_de_voz: string; objetivo: string }>,
): Promise<{ messages: any[]; stories: any[] }> {
  const communityDescriptions = communities.map(c =>
    `- ${c.slug} (${c.nome}): Tom: ${c.tom_de_voz}. Objetivo: ${c.objetivo}`
  ).join('\n')

  const timeSlots = ['08:00', '14:00', '19:20']
  const targetCommunities = communities.filter(c => c.slug !== 'business') // business usa cadência separada

  const prompt = `Você é a Mariana, responsável pela comunicação da IAplicada. Gere mensagens de WhatsApp para divulgar a ${eventType} sobre a ferramenta "${tool}" no dia ${date}.

PESQUISA DA FERRAMENTA:
${toolResearch}

COMUNIDADES:
${communityDescriptions}

REGRAS DE ESCRITA:
- Mensagens de WhatsApp: informal, frases curtas, máx 4-5 linhas por bloco
- Use "pra", "vc", "tbm" naturalmente
- Emojis permitidos: 🤓 e ✱ apenas
- Pontuação correta (acentos obrigatórios)
- NUNCA use: "Sem dúvida", "Com certeza", "Excelente", "Personalizado", "Próximo passo"
- Cada mensagem deve ter gancho diferente (curiosidade, dor, benefício, urgência)

GERE EXATAMENTE:
${targetCommunities.flatMap(c => timeSlots.map(t =>
  `1 mensagem para ${c.slug} às ${t}`
)).join('\n')}

4 roteiros de stories:
- Story 1: Enquete (pergunta provocativa sobre o tema)
- Story 2: Valor/Demo (mostra resultado da ferramenta)
- Story 3: Evento (convite direto para a ${eventType})
- Story 4: CTA pós-aula (pra quem não participou)

Retorne em JSON:
{
  "messages": [
    {"comunidade": "slug", "horario": "HH:MM", "titulo": "titulo curto", "copy_text": "texto completo da mensagem"}
  ],
  "stories": [
    {"story_type": "enquete|valor|evento|cta", "titulo": "titulo", "roteiro": "texto do roteiro"}
  ]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error: ${res.status} - ${err}`)
  }

  const data = await res.json()
  const content = data.content?.[0]?.text || '{}'

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        messages: parsed.messages || [],
        stories: parsed.stories || [],
      }
    }
  } catch (e) {
    console.error('Failed to parse Claude response:', e)
  }

  return { messages: [], stories: [] }
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, tool, date, eventType, category, excludeTools, communities } = body

    let result: any = {}

    switch (action) {
      case 'research': {
        // Pesquisa uma ferramenta via Perplexity
        if (!tool) throw new Error('tool is required')
        const research = await researchTool(tool)
        result = { success: true, research }
        break
      }

      case 'suggest': {
        // Sugere 5 ferramentas via Perplexity
        const tools = await suggestTools(category || 'Produtividade', excludeTools || [])
        result = { success: true, tools }
        break
      }

      case 'generate': {
        // Pipeline completo: pesquisa + gera mensagens + stories
        if (!tool || !date) throw new Error('tool and date are required')
        const research = await researchTool(tool)
        const communityList = communities || [
          { slug: 'gratuita', nome: 'Comunidade Gratuita', tom_de_voz: 'Acessível, motivacional', objetivo: 'Despertar curiosidade' },
          { slug: 'academy', nome: 'IAplicada Academy', tom_de_voz: 'Educacional, hands-on', objetivo: 'Engajar alunos' },
        ]
        const { messages, stories } = await generateMessages(tool, research, eventType || 'aula', date, communityList)
        result = { success: true, research, messages, stories, tool, date }
        break
      }

      case 'generate_cadence_message': {
        // Gera UMA mensagem personalizada para cadência de vendas via Claude
        const { prompt } = body
        if (!prompt) throw new Error('prompt is required')

        if (!CLAUDE_KEY) {
          result = { success: false, message: null, error: 'CLAUDE_API_KEY not configured' }
          break
        }

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': CLAUDE_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error('Claude API error:', res.status, errText)
          result = { success: false, message: null }
          break
        }

        const claudeData = await res.json()
        const messageText = claudeData.content?.[0]?.text || null
        result = { success: true, message: messageText }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}. Use: research, suggest, generate, generate_cadence_message`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-content error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
