-- CRM IAplicada - Seed Data
-- Pipelines, estagios e configuracoes iniciais

-- ==========================================
-- PIPELINE BUSINESS (B2B consultoria/solucao IA)
-- ==========================================
INSERT INTO pipelines (id, name, product) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Business', 'business');

INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'MQL', 1, 5, false, false),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Contato Iniciado', 2, 10, false, false),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Conectado', 3, 20, false, false),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'SQL', 4, 30, false, false),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'Reunião Agendada', 5, 40, false, false),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'Reunião Realizada', 6, 55, false, false),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'Negociação', 7, 70, false, false),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'Contrato Enviado', 8, 85, false, false),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'Negócio Fechado', 9, 100, true, false),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'Negócio Perdido', 10, 0, false, true);

-- ==========================================
-- PIPELINE SKILLS (B2B capacitacao de equipes)
-- ==========================================
INSERT INTO pipelines (id, name, product) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'Skills', 'skills');

INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'MQL', 1, 5, false, false),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Contato Iniciado', 2, 10, false, false),
  ('b2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Conectado', 3, 20, false, false),
  ('b2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'SQL', 4, 30, false, false),
  ('b2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Diagnóstico Agendado', 5, 40, false, false),
  ('b2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'Diagnóstico Realizado', 6, 55, false, false),
  ('b2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'Proposta Enviada', 7, 70, false, false),
  ('b2000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'Negociação', 8, 80, false, false),
  ('b2000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002', 'Negócio Fechado', 9, 100, true, false),
  ('b2000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000002', 'Negócio Perdido', 10, 0, false, true);

-- ==========================================
-- PIPELINE ACADEMY (B2C formacao individual)
-- ==========================================
INSERT INTO pipelines (id, name, product) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'Academy', 'academy');

INSERT INTO stages (id, pipeline_id, name, display_order, probability, is_won, is_lost) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Lead Capturado', 1, 5, false, false),
  ('b3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'MQL', 2, 20, false, false),
  ('b3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'SQL', 3, 40, false, false),
  ('b3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'Contato Iniciado', 4, 50, false, false),
  ('b3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'Conectado', 5, 65, false, false),
  ('b3000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Reunião Agendada', 6, 75, false, false),
  ('b3000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000003', 'Inscrito', 7, 100, true, false),
  ('b3000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Perdido', 8, 0, false, true);

-- ==========================================
-- CONFIGURACAO DE ALERTAS DE LEADS PARADOS
-- ==========================================

-- Business: 3 dias em Contato Iniciado, 5 dias em Negociacao
INSERT INTO stale_alert_configs (pipeline_id, stage_id, threshold_days) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 3),
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000007', 5);

-- Skills: 2 dias em Contato Iniciado, 4 dias em Proposta Enviada
INSERT INTO stale_alert_configs (pipeline_id, stage_id, threshold_days) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 2),
  ('a1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000007', 4);

-- Academy: 1 dia em Contato Iniciado
INSERT INTO stale_alert_configs (pipeline_id, stage_id, threshold_days) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000004', 1);

-- ==========================================
-- EMAIL TEMPLATES - ACADEMY NURTURE (5 emails)
-- ==========================================
INSERT INTO email_templates (product, sequence_order, subject, body_html, delay_days) VALUES
  ('academy', 1, 'Bem-vindo ao Academy IAplicada!',
   '<h1>Bem-vindo!</h1><p>Obrigado por se inscrever no Academy IAplicada. Estamos animados em ter você conosco nessa jornada de aprendizado em Inteligência Artificial.</p><p>Nos próximos dias, vamos compartilhar conteúdos exclusivos sobre como a IA está transformando carreiras e negócios.</p><p>Fique de olho no seu e-mail!</p><p>Abraço,<br>Equipe IAplicada</p>',
   0),
  ('academy', 2, 'Como profissionais estão aplicando IA na prática',
   '<h1>IA na Prática</h1><p>Você sabia que profissionais que dominam IA estão sendo promovidos 2x mais rápido?</p><p>Veja como líderes de mercado estão usando ferramentas de IA para:</p><ul><li>Automatizar tarefas repetitivas e ganhar 10h por semana</li><li>Tomar decisões baseadas em dados em minutos</li><li>Criar apresentações e relatórios 5x mais rápido</li></ul><p>No Academy, você aprende exatamente essas habilidades.</p>',
   2),
  ('academy', 3, 'Case: como a IA transformou a carreira de um profissional',
   '<h1>De Analista a Líder com IA</h1><p>Conheça a história de um dos nossos alunos que usou o conhecimento do Academy para se destacar na empresa e conquistar uma promoção em apenas 6 meses.</p><p>"Antes do Academy, eu gastava horas em tarefas manuais. Hoje, automatizo tudo e foco no que realmente importa: estratégia."</p><p>Quer resultados assim? O próximo pode ser você.</p>',
   5),
  ('academy', 4, 'As 3 objeções mais comuns sobre aprender IA',
   '<h1>Será que IA é para mim?</h1><p>Ouvimos muito essas 3 objeções:</p><p><strong>1. "Não sou de tecnologia"</strong><br>Você não precisa ser programador. O Academy ensina IA aplicada, com ferramentas visuais e práticas.</p><p><strong>2. "Não tenho tempo"</strong><br>Com apenas 30 minutos por dia, você já consegue aplicar o que aprende no trabalho.</p><p><strong>3. "IA vai substituir meu emprego"</strong><br>Na verdade, quem usa IA substitui quem não usa. E quem aprende primeiro sai na frente.</p>',
   8),
  ('academy', 5, 'Última chance: sua vaga está reservada',
   '<h1>Sua vaga está esperando</h1><p>Nos últimos dias, compartilhamos como a IA está transformando carreiras. Agora é a hora de dar o próximo passo.</p><p>Sua vaga no Academy IAplicada está reservada, mas não por muito tempo.</p><p><strong>O que você ganha:</strong></p><ul><li>Acesso a mentor especializado</li><li>Conteúdo organizado e prático</li><li>Comunidade de profissionais em transição</li></ul><p><a href="#">Quero garantir minha vaga →</a></p>',
   12);

-- ==========================================
-- EMAIL TEMPLATES - SKILLS NURTURE (3 emails)
-- ==========================================
INSERT INTO email_templates (product, sequence_order, subject, body_html, delay_days) VALUES
  ('skills', 1, 'O ROI de capacitar sua equipe em IA',
   '<h1>Investir em IA para sua equipe vale a pena?</h1><p>Empresas que capacitam suas equipes em IA reportam:</p><ul><li>40% de aumento em produtividade</li><li>60% de redução em retrabalho</li><li>3x mais velocidade na tomada de decisão</li></ul><p>O Skills IAplicada é o programa de capacitação corporativa em IA mais prático do mercado. Projetado para equipes que precisam de resultados rápidos.</p>',
   0),
  ('skills', 2, 'Resultado: equipe aumentou produtividade em 40%',
   '<h1>Case Real de Sucesso</h1><p>Uma equipe de 15 pessoas em uma empresa de médio porte implementou o Skills IAplicada e em 90 dias alcançou:</p><ul><li>40% mais produtividade com automações</li><li>Redução de 8h semanais em tarefas manuais por pessoa</li><li>Criação de dashboards inteligentes que antes levavam dias</li></ul><p>O melhor: nenhum membro da equipe tinha experiência prévia com IA.</p><p>Imagine o que sua equipe pode alcançar.</p>',
   3),
  ('skills', 3, 'Vamos agendar um diagnóstico gratuito?',
   '<h1>Diagnóstico Gratuito para sua Equipe</h1><p>Queremos entender os desafios da sua equipe e mostrar como a IA pode resolver problemas específicos do seu dia a dia.</p><p>Em 30 minutos, vamos:</p><ul><li>Mapear os gargalos operacionais da equipe</li><li>Identificar as 3 maiores oportunidades de automação</li><li>Apresentar um plano personalizado de capacitação</li></ul><p>Sem compromisso. Sem custo.</p><p><a href="#">Agendar diagnóstico gratuito →</a></p>',
   7);
