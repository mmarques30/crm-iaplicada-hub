// Temporary Edge Function to run SQL migrations
// Deploy this, call it once, then delete it

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Connect with service role to have full access
    const supabase = createClient(supabaseUrl, serviceKey, {
      db: { schema: 'public' }
    })

    const results: string[] = []

    // ── CREATE TABLES ──

    // 1. Communities
    const { error: e1 } = await supabase.from('communities').select('id').limit(1)
    if (e1?.code === 'PGRST205') {
      // Table doesn't exist - we need SQL access
      // Since we can't run DDL via PostgREST, return the SQL to execute manually
      return new Response(JSON.stringify({
        success: false,
        message: 'Tables do not exist yet. Please run the SQL migration manually in the Supabase SQL Editor.',
        instructions: [
          '1. Go to https://supabase.com/dashboard/project/ciwdlceyjsnlnunktqzx/sql',
          '2. Copy the content of supabase-migration-comunicacao.sql',
          '3. Paste and click "Run"',
          '4. Then copy supabase-seed-comunicacao.sql',
          '5. Paste and click "Run"',
          '6. Come back here and click "Atualizar Dados"'
        ]
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    results.push('communities table exists')

    // If tables exist, try to seed data
    // Insert communities
    const { error: commErr } = await supabase.from('communities').upsert([
      { slug: 'gratuita', nome: 'Comunidade Gratuita', descricao: 'Profissionais curiosos sobre IA, em início de jornada', tom_de_voz: 'Acolhedor, Educacional e Inspirador', objetivo: 'Entregar valor, gerar confiança e despertar desejo pelo Academy', emoji_padrao: '🤓', ativo: true },
      { slug: 'academy', nome: 'IAplicada Academy', descricao: 'Alunos mid-level focados em transição de carreira e domínio prático de IA', tom_de_voz: 'Direcional, Motivador e Prático', objetivo: 'Garantir sucesso do aluno, acelerar aplicação, fomentar networking', emoji_padrao: '✱', ativo: true },
      { slug: 'business', nome: 'Skills & Business', descricao: 'Gestores e donos de empresa implementando IA em operações', tom_de_voz: 'Estratégico, Consultivo e Focado em Resultados', objetivo: 'Compartilhar cases, facilitar troca sobre gestão e ROI', emoji_padrao: '🤓', ativo: true },
    ], { onConflict: 'slug' })
    results.push(commErr ? `communities error: ${commErr.message}` : 'communities seeded')

    // Check events table
    const { error: evtCheck } = await supabase.from('events').select('id').limit(1)
    if (evtCheck?.code === 'PGRST205') {
      return new Response(JSON.stringify({
        success: false,
        message: 'events table does not exist. Run supabase-migration-comunicacao.sql first.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Count existing events
    const { count } = await supabase.from('events').select('id', { count: 'exact', head: true })
    if ((count || 0) > 0) {
      results.push(`events already has ${count} records, skipping seed`)
    } else {
      // Seed events
      const events = [
        { titulo: 'Kickoff 2026: As Ferramentas de IA que Vão Mudar Seu Trabalho', tipo: 'aula', ferramenta: 'Visão Geral', data: '2026-01-12', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando GPT-4 ao Vivo', tipo: 'live', ferramenta: 'ChatGPT', data: '2026-01-14', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'ChatGPT na Prática', tipo: 'aula', ferramenta: 'ChatGPT', data: '2026-01-19', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'ChatGPT: Prompts que Funcionam', tipo: 'qa', ferramenta: 'ChatGPT', data: '2026-01-22', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Claude: Documentos Inteiros', tipo: 'aula', ferramenta: 'Claude', data: '2026-01-26', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Claude ao Vivo', tipo: 'live', ferramenta: 'Claude', data: '2026-01-28', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Perplexity: Pesquisa Profissional', tipo: 'aula', ferramenta: 'Perplexity', data: '2026-02-02', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Perplexity: Pro Search', tipo: 'qa', ferramenta: 'Perplexity', data: '2026-02-05', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'ManyChat: Robô Instagram', tipo: 'aula', ferramenta: 'ManyChat', data: '2026-02-09', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Perplexity ao Vivo', tipo: 'live', ferramenta: 'Perplexity', data: '2026-02-11', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Gamma + Napkin AI', tipo: 'aula', ferramenta: 'Gamma', data: '2026-02-23', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Gamma: Templates', tipo: 'qa', ferramenta: 'Gamma', data: '2026-02-26', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Canva AI: Design Profissional', tipo: 'aula', ferramenta: 'Canva AI', data: '2026-03-02', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Canva AI ao Vivo', tipo: 'live', ferramenta: 'Canva AI', data: '2026-03-04', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Notion AI: Projetos e Tarefas', tipo: 'aula', ferramenta: 'Notion AI', data: '2026-03-09', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Notion AI: Templates Prontos', tipo: 'qa', ferramenta: 'Notion AI', data: '2026-03-12', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Propostas com IA', tipo: 'aula', ferramenta: 'Propostas com IA', data: '2026-03-16', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Notion AI ao Vivo', tipo: 'live', ferramenta: 'Notion AI', data: '2026-03-18', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Propostas: Templates e Automação', tipo: 'qa', ferramenta: 'Propostas', data: '2026-03-19', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'NotebookLM: Documento em Podcast', tipo: 'aula', ferramenta: 'NotebookLM', data: '2026-03-23', horario: '19:30', status: 'concluido', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Venngage: Infográficos com IA', tipo: 'aula', ferramenta: 'Venngage', data: '2026-03-30', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Q&A: NotebookLM + Descript', tipo: 'qa', ferramenta: 'NotebookLM + Descript', data: '2026-04-02', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Lovable: Site Conversando com IA', tipo: 'aula', ferramenta: 'Lovable', data: '2026-04-06', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Lovable ao Vivo', tipo: 'live', ferramenta: 'Lovable', data: '2026-04-08', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Google Gemini: Gmail e Drive', tipo: 'aula', ferramenta: 'Google Gemini', data: '2026-04-13', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Q&A: Lovable + Gemini', tipo: 'qa', ferramenta: 'Lovable + Gemini', data: '2026-04-16', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Imagens com IA: Ideogram + Midjourney', tipo: 'aula', ferramenta: 'Ideogram + Midjourney', data: '2026-04-20', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Ideogram ao Vivo', tipo: 'live', ferramenta: 'Ideogram', data: '2026-04-22', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Top 10 Ferramentas + Próximos Passos', tipo: 'aula', ferramenta: 'Encerramento', data: '2026-04-27', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Q&A Final: Imagens + Encerramento', tipo: 'qa', ferramenta: 'Ideogram + Encerramento', data: '2026-04-30', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Castmagic: 1 Gravação = 10 Conteúdos', tipo: 'aula', ferramenta: 'Castmagic', data: '2026-05-04', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Castmagic ao Vivo', tipo: 'live', ferramenta: 'Castmagic', data: '2026-05-06', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Chatbase: Chatbot 24h', tipo: 'aula', ferramenta: 'Chatbase', data: '2026-05-11', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Q&A: Castmagic + Chatbase', tipo: 'qa', ferramenta: 'Castmagic + Chatbase', data: '2026-05-14', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Make: Automações sem Código', tipo: 'aula', ferramenta: 'Make', data: '2026-05-18', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Testando Make ao Vivo', tipo: 'live', ferramenta: 'Make', data: '2026-05-20', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Stack Completa de IA', tipo: 'aula', ferramenta: 'Stack Completa', data: '2026-05-25', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
        { titulo: 'Q&A Final do Semestre', tipo: 'qa', ferramenta: 'Make + Stack', data: '2026-05-28', horario: '19:30', status: 'pendente', comunidade: 'gratuita', produto: 'academy' },
      ]
      const { error: evtErr } = await supabase.from('events').insert(events)
      results.push(evtErr ? `events error: ${evtErr.message}` : `events: ${events.length} inserted`)
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
