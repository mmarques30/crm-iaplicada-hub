-- ============================================
-- SEED DATA: Sistema de Comunicação Unificado
-- Dados reais exportados do dashboard HTML
-- ============================================

-- ── ATUALIZAR COMUNIDADES com dados reais ──
UPDATE communities SET
  descricao = 'Profissionais curiosos sobre IA, em início de jornada, buscando um norte',
  tom_de_voz = 'Acolhedor, Educacional e Inspirador',
  objetivo = 'Entregar valor, gerar confiança e despertar desejo pelo Academy'
WHERE slug = 'gratuita';

UPDATE communities SET
  descricao = 'Alunos mid-level focados em transição de carreira e domínio prático de IA',
  tom_de_voz = 'Direcional, Motivador e Prático',
  objetivo = 'Garantir sucesso do aluno, acelerar aplicação, fomentar networking'
WHERE slug = 'academy';

UPDATE communities SET
  nome = 'Skills & Business',
  descricao = 'Gestores e donos de empresa implementando IA em operações',
  tom_de_voz = 'Estratégico, Consultivo e Focado em Resultados',
  objetivo = 'Compartilhar cases, facilitar troca sobre gestão e ROI'
WHERE slug = 'business';

-- ── INSERIR EVENTOS ──
INSERT INTO events (titulo, descricao, tipo, ferramenta, data, horario, status, comunidade, produto) VALUES
('Kickoff 2026: As Ferramentas de IA que Vão Mudar Seu Trabalho', 'Panorama completo das ferramentas de IA mais impactantes para 2026', 'aula', 'Visão Geral', '2026-01-12', '19:30', 'concluido', 'gratuita', 'academy'),
('Testando GPT-4 ao Vivo', 'O ChatGPT é um assistente de IA que conversa em linguagem natural', 'live', 'ChatGPT', '2026-01-14', '19:30', 'concluido', 'gratuita', 'academy'),
('ChatGPT na Prática: Textos, Planilhas e Análises em Minutos', 'Prompts que realmente funcionam no dia a dia', 'aula', 'ChatGPT', '2026-01-19', '19:30', 'concluido', 'gratuita', 'academy'),
('ChatGPT: Prompts que Funcionam de Verdade', '10 prompts de ChatGPT que funcionam de verdade', 'qa', 'ChatGPT', '2026-01-22', '19:30', 'concluido', 'gratuita', 'academy'),
('Claude: O Assistente que Entende Documentos Inteiros', 'Claude da Anthropic para análise de documentos longos', 'aula', 'Claude', '2026-01-26', '19:30', 'concluido', 'gratuita', 'academy'),
('Testando Claude ao Vivo', 'Claude vs ChatGPT ao vivo', 'live', 'Claude', '2026-01-28', '19:30', 'concluido', 'gratuita', 'academy'),
('Perplexity: Pesquisa que Substitui Horas de Google', 'Motor de pesquisa com IA e fontes verificáveis', 'aula', 'Perplexity', '2026-02-02', '19:30', 'concluido', 'gratuita', 'academy'),
('Perplexity: Pro Search e Coleções de Pesquisa', 'Pro Search e Coleções na prática', 'qa', 'Perplexity', '2026-02-05', '19:30', 'concluido', 'gratuita', 'academy'),
('ManyChat: Robô de Atendimento no Instagram em 15 Minutos', 'Automação de Instagram e WhatsApp', 'aula', 'ManyChat', '2026-02-09', '19:30', 'concluido', 'gratuita', 'academy'),
('Testando Perplexity ao Vivo', 'Pesquisa profissional ao vivo', 'live', 'Perplexity', '2026-02-11', '19:30', 'concluido', 'gratuita', 'academy'),
('Gamma + Napkin AI: Apresentações e Infográficos com IA em 5 Minutos', 'Apresentações profissionais com IA', 'aula', 'Gamma', '2026-02-23', '19:30', 'concluido', 'gratuita', 'academy'),
('Gamma: Templates, Estilos e Personalização', 'Templates e personalização', 'qa', 'Gamma', '2026-02-26', '19:30', 'concluido', 'gratuita', 'academy'),
('Canva AI: Design Profissional sem Saber Design', 'Magic Design e recursos de IA do Canva', 'aula', 'Canva AI', '2026-03-02', '19:30', 'concluido', 'gratuita', 'academy'),
('Testando Canva AI ao Vivo', 'Designs criados ao vivo', 'live', 'Canva AI', '2026-03-04', '19:30', 'concluido', 'gratuita', 'academy'),
('Notion AI: Organize Projetos e Tarefas sem Esforço', 'Workspace inteligente com IA', 'aula', 'Notion AI', '2026-03-09', '19:30', 'concluido', 'gratuita', 'academy'),
('Notion AI: Templates Prontos pra Copiar e Usar', 'Templates prontos para copiar', 'qa', 'Notion AI', '2026-03-12', '19:30', 'concluido', 'gratuita', 'academy'),
('Propostas Comerciais com IA: Templates que Vendem Sozinhos', 'Propostas com ChatGPT e Claude', 'aula', 'Propostas com IA', '2026-03-16', '19:30', 'concluido', 'gratuita', 'academy'),
('Testando Notion AI ao Vivo', 'Projeto do zero ao vivo', 'live', 'Notion AI', '2026-03-18', '19:30', 'concluido', 'gratuita', 'academy'),
('Propostas: Templates e Automação de Envio', 'Templates e automação de propostas', 'qa', 'Propostas', '2026-03-19', '19:30', 'concluido', 'gratuita', 'academy'),
('NotebookLM: Transforme Qualquer Documento em Podcast com IA', 'Documentos em podcasts com Google', 'aula', 'NotebookLM', '2026-03-23', '19:30', 'concluido', 'gratuita', 'academy'),
('Venngage: Crie infográficos e apresentações profissionais com IA', 'Infográficos e visualização de dados', 'aula', 'Venngage', '2026-03-30', '19:30', 'pendente', 'gratuita', 'academy'),
('Tira-Dúvidas: NotebookLM e Descript na Prática', 'Q&A NotebookLM e Descript', 'qa', 'NotebookLM + Descript', '2026-04-02', '19:30', 'pendente', 'gratuita', 'academy'),
('Lovable: Crie um Site Profissional Conversando com IA', 'Sites por conversa com IA', 'aula', 'Lovable', '2026-04-06', '19:30', 'pendente', 'gratuita', 'academy'),
('Testando Lovable ao Vivo', 'Site do zero ao vivo', 'live', 'Lovable', '2026-04-08', '19:30', 'pendente', 'gratuita', 'academy'),
('Google Gemini: O Assistente que Já Está no Seu Gmail e Drive', 'IA integrada ao Google Workspace', 'aula', 'Google Gemini', '2026-04-13', '19:30', 'pendente', 'gratuita', 'academy'),
('Tira-Dúvidas: Lovable e Google Gemini na Prática', 'Q&A Lovable e Gemini', 'qa', 'Lovable + Gemini', '2026-04-16', '19:30', 'pendente', 'gratuita', 'academy'),
('Imagens Profissionais com IA: Ideogram, Midjourney e DALL-E', 'Geração de imagens comparada', 'aula', 'Ideogram + Midjourney', '2026-04-20', '19:30', 'pendente', 'gratuita', 'academy'),
('Testando Ideogram ao Vivo', 'Logos e banners ao vivo', 'live', 'Ideogram', '2026-04-22', '19:30', 'pendente', 'gratuita', 'academy'),
('As 10 Ferramentas que Mais Valeram a Pena — e Seus Próximos Passos', 'Ranking e próximos passos', 'aula', 'Encerramento', '2026-04-27', '19:30', 'pendente', 'gratuita', 'academy'),
('Imagens + Encerramento: Tira-Dúvidas Final', 'Q&A final do semestre', 'qa', 'Ideogram + Encerramento', '2026-04-30', '19:30', 'pendente', 'gratuita', 'academy'),
('Castmagic: Transforme 1 Gravação em 10 Conteúdos com IA', '1 gravação = 10 conteúdos', 'aula', 'Castmagic', '2026-05-04', '19:30', 'pendente', 'gratuita', 'academy'),
('Testando Castmagic ao Vivo', 'Gravação ao vivo', 'live', 'Castmagic', '2026-05-06', '19:30', 'pendente', 'gratuita', 'academy'),
('Chatbase: Crie um Chatbot com IA que Atende Seus Clientes 24h', 'Chatbot treinado nos seus docs', 'aula', 'Chatbase', '2026-05-11', '19:30', 'pendente', 'gratuita', 'academy'),
('Castmagic + Chatbase: Tira-Dúvidas', 'Q&A Castmagic e Chatbase', 'qa', 'Castmagic + Chatbase', '2026-05-14', '19:30', 'pendente', 'gratuita', 'academy'),
('Make: Conecte Suas Ferramentas sem Programar', 'Automações visuais', 'aula', 'Make', '2026-05-18', '19:30', 'pendente', 'gratuita', 'academy'),
('Testando Make ao Vivo', 'Automações criadas ao vivo', 'live', 'Make', '2026-05-20', '19:30', 'pendente', 'gratuita', 'academy'),
('Montando Sua Stack de IA: Do Zero ao Sistema Funcionando', 'Stack personalizada por perfil', 'aula', 'Stack Completa', '2026-05-25', '19:30', 'pendente', 'gratuita', 'academy'),
('Make + Stack: Tira-Dúvidas Final do Semestre', 'Q&A final', 'qa', 'Make + Stack', '2026-05-28', '19:30', 'pendente', 'gratuita', 'academy')
ON CONFLICT DO NOTHING;

-- ── INSERIR CAMPANHA DE LANÇAMENTO ──
INSERT INTO launch_campaigns (nome, big_idea, inimigo_narrativo, metodo, oferta, data_inicio, data_fim, status) VALUES
('IAplicada Recorrência', 'O mercado te cobra saber IA. Mas ninguém te diz o que fazer com ela na segunda-feira de manhã.', 'A Cobrança Sem Caminho', 'APLICA: A-Analisar seu trabalho atual, P-Priorizar onde IA gera mais impacto, L-Levantar as ferramentas certas, I-Implementar no seu fluxo real, C-Compartilhar resultados na equipe, A-Automatizar o que já funciona', 'R$147/mês — sem fidelidade', '2026-03-27', '2026-04-20', 'ativo')
ON CONFLICT DO NOTHING;
