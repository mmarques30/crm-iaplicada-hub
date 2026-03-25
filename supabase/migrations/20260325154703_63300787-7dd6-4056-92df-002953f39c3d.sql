
-- Import fiscal data into vendas (UPDATE existing records with fiscal fields)
UPDATE vendas SET status_nf = 'pendente' WHERE status_nf IS NULL;

-- Update Business clients with rich fiscal data
UPDATE vendas SET razao_social = 'BORGES & ZEMBRUSKI ADVOCACIA', cpf_cnpj = '51.726.414/0001-33', endereco = 'Av. Ipiranga, 7464, sala 416, bairro Jardim do Salso', cep = '91.410-500', email_fiscal = 'julianalimaborges@hotmail.com', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'B&Z' AND email = 'julianalimaborges@hotmail.com';

UPDATE vendas SET razao_social = 'MEIRE DE FÁTIMA LYRA IZIDIO LOPES', cpf_cnpj = '037.286.856-82', email_fiscal = 'mflilopes@gmail.com', descricao_servico = 'Mentoria em IA Aplicada aos Negócios - IAPLICADA PRO', status_nf = 'pendente' WHERE nome = 'Cimed Medicamentos' AND email = 'mflilopes@gmail.com';

UPDATE vendas SET cpf_cnpj = '011.927.006-43', email_fiscal = 'camartins50@gmail.com', descricao_servico = 'Implementação de automações inteligentes via WhatsApp e agenda', status_nf = 'pendente' WHERE nome = 'Cláudio Adriano Martins' AND email = 'camartins50@gmail.com';

UPDATE vendas SET razao_social = 'ENGELMIG AUTOMAÇÃO E ENERGIA LTDA', cpf_cnpj = '21.066.139/0001-08', email_fiscal = 'carolina.felix@engelmig.com.br', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Livia | Engelmig' AND email = 'carolina.felix@engelmig.com.br';

UPDATE vendas SET cpf_cnpj = '179.584.768-92', email_fiscal = 'gibafranca@gmail.com', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Engforms' AND email = 'gibafranca@gmail.com';

UPDATE vendas SET razao_social = 'FOCUS FINTAX LTDA', cpf_cnpj = '50.654.800/0001-02', email_fiscal = 'alcir@focuscontabil.com', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Focus Fintax LTDA' AND email = 'alcir@focuscontabil.com';

UPDATE vendas SET razao_social = 'J IMOBI GESTÃO E NEGÓCIOS LTDA', cpf_cnpj = '43.126.462/0001-62', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'J IMOBI';

UPDATE vendas SET cpf_cnpj = '023.551.180-35', email_fiscal = 'julia@reconinc.com.br', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Júlia Ellwanger da Cruz' AND email = 'julia@reconinc.com.br';

UPDATE vendas SET cpf_cnpj = '062.496.936-37', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Paula FLI';

UPDATE vendas SET razao_social = 'QUADRA ARQUITETURA LTDA', cpf_cnpj = '46.731.679/0001-90', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Quadra Arquitetura';

UPDATE vendas SET razao_social = 'TÂNIA DANIELLE BARBOSA IZIDIO', cpf_cnpj = '112.503.596-00', email_fiscal = 'taniabarbosa_@outlook.com', descricao_servico = 'Mentoria em IA Aplicada aos Negócios - IAPLICADA PRO', status_nf = 'pendente' WHERE nome = 'Tânia Danielle | Moyses' AND email = 'taniabarbosa_@outlook.com';

UPDATE vendas SET razao_social = 'AGÊNCIA ROCHA GLOBAL', cpf_cnpj = '47.229.908/0001-35', email_fiscal = 'karen.torres@yoursolutions.com', descricao_servico = 'Consultoria em transformação digital e IA - Metodologia D.A.T.A.S.', status_nf = 'pendente' WHERE nome = 'Turystar' AND email = 'karen.torres@yoursolutions.com';

-- Insert regularização NF records for March 2026
INSERT INTO notas_fiscais (numero_nf, cpf_cnpj, razao_social, mes_referencia, endereco, descricao_servico, valor, status_nf) VALUES
(1, '51.726.414/0001-33', 'BORGES & ZEMBRUSKI ADVOCACIA', 'Março/2026', 'Av. Ipiranga, 7464, sala 416, bairro Jardim do Salso, Porto Alegre, RS, 91.410-500', 'Prestação de serviços de consultoria especializada em transformação digital e implementação de soluções de IA, através da metodologia D.A.T.A.S. - FASE 1: Diagnóstico e Estratégia, FASE 2: Implementação Digital, FASE 3: Capacitação e Padronização.', 1814.17, 'pendente'),
(2, '011.927.006-43', 'CLÁUDIO ADRIANO MARTINS', 'Março/2026', 'Rua Julindo Batista Lins, 80, Casa Branca, Belo Horizonte, MG, 31050-040', 'Implementação de automações inteligentes via WhatsApp e sistemas de agenda. Inclui: Triagem Inteligente, FAQ Automático, Agendamento Inteligente e Confirmação + Lembrete com integração Google Sheets. 12 meses de suporte técnico.', 1350.00, 'pendente'),
(3, '50.654.800/0001-02', 'FOCUS FINTAX LTDA', 'Março/2026', 'Rua Conde de Bonfim, 383 - Sala 710, Tijuca, Rio de Janeiro, RJ, 20.520-054', 'Consultoria em transformação digital e IA via metodologia D.A.T.A.S. - Diagnóstico, Mapeamento de Processos, Ferramentas de Transformação Digital, Dashboards, CRM, Padronização de Documentos e Ferramenta com IA personalizada.', 5250.00, 'pendente'),
(4, '43.126.462/0001-62', 'J IMOBI GESTÃO E NEGÓCIOS LTDA', 'Março/2026', 'Rua dos Inconfidentes, 1190, sala 810, Savassi, Belo Horizonte, MG, 30.140-128', 'Consultoria em transformação digital e IA via metodologia D.A.T.A.S. - Diagnóstico, Mapeamento, Automação, Dashboards, CRM e Capacitação.', 1199.60, 'pendente'),
(5, '46.731.679/0001-90', 'QUADRA ARQUITETURA LTDA', 'Março/2026', 'Rua Luiz Pimenta de Castro, 89, apto 3, Ouro Preto, Belo Horizonte, MG, 31310-460', 'Consultoria em transformação digital e IA via metodologia D.A.T.A.S. - Diagnóstico, Mapeamento, Automação, Dashboards, CRM e Capacitação.', 1666.67, 'pendente'),
(6, '47.229.908/0001-35', 'AGÊNCIA ROCHA GLOBAL', 'Março/2026', 'Rua Candelária, 9, Centro, Rio de Janeiro, RJ, 20091-020', 'Consultoria em transformação digital e IA via metodologia D.A.T.A.S. - Diagnóstico, Mapeamento, Automação, Dashboards, CRM e Capacitação.', 3082.00, 'pendente');
