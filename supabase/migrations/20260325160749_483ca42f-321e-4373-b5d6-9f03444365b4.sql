
-- Clear existing metas for 2026 and insert Business Plan data
DELETE FROM metas WHERE ano = 2026;

-- RECEITA GERAL (receita_total)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'receita_total',54000),(2026,2,'receita_total',126000),(2026,3,'receita_total',91000),
(2026,4,'receita_total',137000),(2026,5,'receita_total',176000),(2026,6,'receita_total',205000),
(2026,7,'receita_total',216000),(2026,8,'receita_total',244000),(2026,9,'receita_total',255000),
(2026,10,'receita_total',281000),(2026,11,'receita_total',323000),(2026,12,'receita_total',323000);

-- BUSINESS (receita_business)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'receita_business',25000),(2026,2,'receita_business',75000),(2026,3,'receita_business',50000),
(2026,4,'receita_business',75000),(2026,5,'receita_business',100000),(2026,6,'receita_business',125000),
(2026,7,'receita_business',125000),(2026,8,'receita_business',150000),(2026,9,'receita_business',150000),
(2026,10,'receita_business',175000),(2026,11,'receita_business',200000),(2026,12,'receita_business',200000);

-- Business Ticket Medio
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'business_ticket',25000),(2026,2,'business_ticket',25000),(2026,3,'business_ticket',25000),
(2026,4,'business_ticket',25000),(2026,5,'business_ticket',25000),(2026,6,'business_ticket',25000),
(2026,7,'business_ticket',25000),(2026,8,'business_ticket',25000),(2026,9,'business_ticket',25000),
(2026,10,'business_ticket',25000),(2026,11,'business_ticket',25000),(2026,12,'business_ticket',25000);

-- Business #Vendas
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'business_vendas',2),(2026,2,'business_vendas',3),(2026,3,'business_vendas',4),
(2026,4,'business_vendas',5),(2026,5,'business_vendas',6),(2026,6,'business_vendas',7),
(2026,7,'business_vendas',8),(2026,8,'business_vendas',9),(2026,9,'business_vendas',10),
(2026,10,'business_vendas',11),(2026,11,'business_vendas',12),(2026,12,'business_vendas',10);

-- Business #SDRs
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'business_sdrs',0),(2026,2,'business_sdrs',0),(2026,3,'business_sdrs',0),
(2026,4,'business_sdrs',1),(2026,5,'business_sdrs',1),(2026,6,'business_sdrs',1),
(2026,7,'business_sdrs',2),(2026,8,'business_sdrs',2),(2026,9,'business_sdrs',2),
(2026,10,'business_sdrs',3),(2026,11,'business_sdrs',3),(2026,12,'business_sdrs',3);

-- Business #Vendedores
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'business_vendedores',0),(2026,2,'business_vendedores',0),(2026,3,'business_vendedores',0),
(2026,4,'business_vendedores',1),(2026,5,'business_vendedores',1),(2026,6,'business_vendedores',1),
(2026,7,'business_vendedores',0),(2026,8,'business_vendedores',2),(2026,9,'business_vendedores',2),
(2026,10,'business_vendedores',3),(2026,11,'business_vendedores',3),(2026,12,'business_vendedores',3);

-- SKILLS (receita_skills)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'receita_skills',10000),(2026,2,'receita_skills',21000),(2026,3,'receita_skills',14000),
(2026,4,'receita_skills',21000),(2026,5,'receita_skills',28000),(2026,6,'receita_skills',28000),
(2026,7,'receita_skills',35000),(2026,8,'receita_skills',35000),(2026,9,'receita_skills',42000),
(2026,10,'receita_skills',42000),(2026,11,'receita_skills',49000),(2026,12,'receita_skills',49000);

-- Skills Ticket Medio
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'skills_ticket',3000),(2026,2,'skills_ticket',3000),(2026,3,'skills_ticket',3000),
(2026,4,'skills_ticket',3000),(2026,5,'skills_ticket',3000),(2026,6,'skills_ticket',3000),
(2026,7,'skills_ticket',3000),(2026,8,'skills_ticket',3000),(2026,9,'skills_ticket',3000),
(2026,10,'skills_ticket',3000),(2026,11,'skills_ticket',3000),(2026,12,'skills_ticket',3000);

-- Skills #Vendas
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'skills_vendas',3),(2026,2,'skills_vendas',5),(2026,3,'skills_vendas',7),
(2026,4,'skills_vendas',9),(2026,5,'skills_vendas',11),(2026,6,'skills_vendas',13),
(2026,7,'skills_vendas',15),(2026,8,'skills_vendas',17),(2026,9,'skills_vendas',19),
(2026,10,'skills_vendas',21),(2026,11,'skills_vendas',25),(2026,12,'skills_vendas',21);

-- ACADEMY (receita_academy)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'receita_academy',19000),(2026,2,'receita_academy',30000),(2026,3,'receita_academy',27000),
(2026,4,'receita_academy',41000),(2026,5,'receita_academy',48000),(2026,6,'receita_academy',52000),
(2026,7,'receita_academy',56000),(2026,8,'receita_academy',59000),(2026,9,'receita_academy',63000),
(2026,10,'receita_academy',64000),(2026,11,'receita_academy',74000),(2026,12,'receita_academy',74000);

-- Academy Ticket Medio
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'academy_ticket',1000),(2026,2,'academy_ticket',1000),(2026,3,'academy_ticket',1000),
(2026,4,'academy_ticket',1000),(2026,5,'academy_ticket',1000),(2026,6,'academy_ticket',1000),
(2026,7,'academy_ticket',1000),(2026,8,'academy_ticket',1000),(2026,9,'academy_ticket',1000),
(2026,10,'academy_ticket',1000),(2026,11,'academy_ticket',1000),(2026,12,'academy_ticket',1000);

-- Academy #Vendas
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'academy_vendas',8),(2026,2,'academy_vendas',12),(2026,3,'academy_vendas',14),
(2026,4,'academy_vendas',16),(2026,5,'academy_vendas',18),(2026,6,'academy_vendas',20),
(2026,7,'academy_vendas',22),(2026,8,'academy_vendas',24),(2026,9,'academy_vendas',26),
(2026,10,'academy_vendas',28),(2026,11,'academy_vendas',30),(2026,12,'academy_vendas',32);

-- FOLHA (folha_total)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_total',19000),(2026,2,'folha_total',23000),(2026,3,'folha_total',21000),
(2026,4,'folha_total',23000),(2026,5,'folha_total',25000),(2026,6,'folha_total',27000),
(2026,7,'folha_total',27000),(2026,8,'folha_total',29000),(2026,9,'folha_total',29000),
(2026,10,'folha_total',31000),(2026,11,'folha_total',33000),(2026,12,'folha_total',33000);

-- Folha Diretoria
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_diretoria',10000),(2026,2,'folha_diretoria',10000),(2026,3,'folha_diretoria',10000),
(2026,4,'folha_diretoria',10000),(2026,5,'folha_diretoria',10000),(2026,6,'folha_diretoria',10000),
(2026,7,'folha_diretoria',10000),(2026,8,'folha_diretoria',10000),(2026,9,'folha_diretoria',10000),
(2026,10,'folha_diretoria',10000),(2026,11,'folha_diretoria',10000),(2026,12,'folha_diretoria',10000);

-- Folha Marketing
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_marketing',3000),(2026,2,'folha_marketing',3000),(2026,3,'folha_marketing',3000),
(2026,4,'folha_marketing',3000),(2026,5,'folha_marketing',3000),(2026,6,'folha_marketing',3000),
(2026,7,'folha_marketing',3000),(2026,8,'folha_marketing',3000),(2026,9,'folha_marketing',3000),
(2026,10,'folha_marketing',3000),(2026,11,'folha_marketing',3000),(2026,12,'folha_marketing',3000);

-- Folha Vendas (0 in most months based on image)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_vendas',0),(2026,2,'folha_vendas',0),(2026,3,'folha_vendas',0),
(2026,4,'folha_vendas',0),(2026,5,'folha_vendas',0),(2026,6,'folha_vendas',0),
(2026,7,'folha_vendas',0),(2026,8,'folha_vendas',0),(2026,9,'folha_vendas',0),
(2026,10,'folha_vendas',0),(2026,11,'folha_vendas',0),(2026,12,'folha_vendas',0);

-- Folha Comissão (5%)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_comissao',3000),(2026,2,'folha_comissao',6000),(2026,3,'folha_comissao',5000),
(2026,4,'folha_comissao',7000),(2026,5,'folha_comissao',9000),(2026,6,'folha_comissao',10000),
(2026,7,'folha_comissao',11000),(2026,8,'folha_comissao',12000),(2026,9,'folha_comissao',13000),
(2026,10,'folha_comissao',14000),(2026,11,'folha_comissao',16000),(2026,12,'folha_comissao',16000);

-- Folha Operações
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'folha_operacoes',4000),(2026,2,'folha_operacoes',4000),(2026,3,'folha_operacoes',4000),
(2026,4,'folha_operacoes',4000),(2026,5,'folha_operacoes',4000),(2026,6,'folha_operacoes',4000),
(2026,7,'folha_operacoes',4000),(2026,8,'folha_operacoes',4000),(2026,9,'folha_operacoes',4000),
(2026,10,'folha_operacoes',4000),(2026,11,'folha_operacoes',4000),(2026,12,'folha_operacoes',4000);

-- PUBLICIDADE
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'publicidade',5000),(2026,2,'publicidade',13000),(2026,3,'publicidade',9000),
(2026,4,'publicidade',14000),(2026,5,'publicidade',18000),(2026,6,'publicidade',20000),
(2026,7,'publicidade',22000),(2026,8,'publicidade',24000),(2026,9,'publicidade',25000),
(2026,10,'publicidade',28000),(2026,11,'publicidade',32000),(2026,12,'publicidade',32000);

-- CUSTOS (custos_total)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'custos_total',13000),(2026,2,'custos_total',18000),(2026,3,'custos_total',15000),
(2026,4,'custos_total',18000),(2026,5,'custos_total',21000),(2026,6,'custos_total',22000),
(2026,7,'custos_total',23000),(2026,8,'custos_total',25000),(2026,9,'custos_total',25000),
(2026,10,'custos_total',27000),(2026,11,'custos_total',29000),(2026,12,'custos_total',29000);

-- Custos Impostos (6%)
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'custos_impostos',3000),(2026,2,'custos_impostos',8000),(2026,3,'custos_impostos',5000),
(2026,4,'custos_impostos',8000),(2026,5,'custos_impostos',11000),(2026,6,'custos_impostos',12000),
(2026,7,'custos_impostos',13000),(2026,8,'custos_impostos',15000),(2026,9,'custos_impostos',15000),
(2026,10,'custos_impostos',17000),(2026,11,'custos_impostos',19000),(2026,12,'custos_impostos',19000);

-- Custos Sistemas
INSERT INTO metas (ano, mes, categoria, valor_projetado) VALUES
(2026,1,'custos_sistemas',10000),(2026,2,'custos_sistemas',10000),(2026,3,'custos_sistemas',10000),
(2026,4,'custos_sistemas',10000),(2026,5,'custos_sistemas',10000),(2026,6,'custos_sistemas',10000),
(2026,7,'custos_sistemas',10000),(2026,8,'custos_sistemas',10000),(2026,9,'custos_sistemas',10000),
(2026,10,'custos_sistemas',10000),(2026,11,'custos_sistemas',10000),(2026,12,'custos_sistemas',10000);
