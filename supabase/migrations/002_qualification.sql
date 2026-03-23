-- CRM IAplicada - Funcoes de Qualificacao
-- Logica MQL/SQL por produto conforme briefing

-- Funcao: qualificar contato para Business
-- MQL: cargo IN (CEO, Diretor, Gerente, Coordenador, Analista) AND faixa_de_faturamento IS NOT NULL
CREATE OR REPLACE FUNCTION qualify_business(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cargo TEXT;
  v_faturamento TEXT;
  v_cargos_validos TEXT[] := ARRAY[
    'CEO / Fundador / Sócio',
    'Diretor / Head',
    'Gerente',
    'Coordenador / Supervisor',
    'Analista'
  ];
BEGIN
  SELECT cargo, faixa_de_faturamento
  INTO v_cargo, v_faturamento
  FROM contacts WHERE id = p_contact_id;

  IF v_cargo = ANY(v_cargos_validos) AND v_faturamento IS NOT NULL AND v_faturamento != '' THEN
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

-- Funcao: qualificar contato para Skills
-- MQL: cargo IN (CEO, Diretor, Gerente, Coordenador)
--   AND numero_de_liderados IN (3-5, 5-10, 10+)
--   AND faixa_de_faturamento IN (5MM+)
CREATE OR REPLACE FUNCTION qualify_skills(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cargo TEXT;
  v_liderados TEXT;
  v_faturamento TEXT;
  v_cargos_validos TEXT[] := ARRAY[
    'CEO / Fundador / Sócio',
    'Diretor / Head',
    'Gerente',
    'Coordenador / Supervisor'
  ];
  v_liderados_validos TEXT[] := ARRAY[
    'Entre 3 e 5 liderados',
    'Entre 5 e 10 liderados',
    'Mais de 10'
  ];
  v_faturamento_validos TEXT[] := ARRAY[
    'Entre 5MM e 10MM',
    'Entre 10MM e 50MM',
    'Acima de 50MM'
  ];
BEGIN
  SELECT cargo, numero_de_liderados, faixa_de_faturamento
  INTO v_cargo, v_liderados, v_faturamento
  FROM contacts WHERE id = p_contact_id;

  IF v_cargo = ANY(v_cargos_validos)
     AND v_liderados = ANY(v_liderados_validos)
     AND v_faturamento = ANY(v_faturamento_validos) THEN
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

-- Funcao: qualificar contato para Academy
-- MQL: renda_mensal IN (4.001+) AND motivo_para_aprender_ia IN (Transicao, Promocao, Criar/escalar)
-- SQL: MQL + objetivo_com_a_comunidade IN (mentor, treinamento)
CREATE OR REPLACE FUNCTION qualify_academy(p_contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_renda TEXT;
  v_motivo TEXT;
  v_objetivo TEXT;
  v_renda_valida TEXT[] := ARRAY[
    'De R$ 4.001 a R$ 8.000',
    'De R$ 8.001 a R$ 12.000',
    'Acima de R$ 12.000'
  ];
  v_motivo_valido TEXT[] := ARRAY[
    'Transição de carreira',
    'Promoção/referência profissional',
    'Criar/escalar negócio'
  ];
  v_objetivo_sql TEXT[] := ARRAY[
    'Acessar um mentor para acelerar carreira',
    'Acessar treinamento com conteúdos organizados'
  ];
BEGIN
  SELECT renda_mensal, motivo_para_aprender_ia, objetivo_com_a_comunidade
  INTO v_renda, v_motivo, v_objetivo
  FROM contacts WHERE id = p_contact_id;

  -- Verificar MQL primeiro
  IF v_renda = ANY(v_renda_valida) AND v_motivo = ANY(v_motivo_valido) THEN
    -- Verificar SQL (criterio adicional apos MQL)
    IF v_objetivo = ANY(v_objetivo_sql) THEN
      RETURN 'sql';
    END IF;
    RETURN 'mql';
  END IF;

  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

-- Funcao generica que chama a qualificacao correta por produto
CREATE OR REPLACE FUNCTION qualify_contact(p_contact_id UUID, p_product product_type)
RETURNS TEXT AS $$
BEGIN
  CASE p_product
    WHEN 'business' THEN RETURN qualify_business(p_contact_id);
    WHEN 'skills' THEN RETURN qualify_skills(p_contact_id);
    WHEN 'academy' THEN RETURN qualify_academy(p_contact_id);
  END CASE;
  RETURN 'lead';
END;
$$ LANGUAGE plpgsql;

-- Trigger: quando contato e atualizado, recalcular qualificacao de todos os deals associados
CREATE OR REPLACE FUNCTION recalculate_deal_qualification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
BEGIN
  FOR v_deal IN SELECT id, product FROM deals WHERE contact_id = NEW.id AND is_won IS NULL LOOP
    UPDATE deals
    SET qualification_status = qualify_contact(NEW.id, v_deal.product)
    WHERE id = v_deal.id;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_qualification_update
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION recalculate_deal_qualification();
