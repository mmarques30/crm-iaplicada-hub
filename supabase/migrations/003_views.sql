-- CRM IAplicada - Views para dashboards e metricas

-- View: deals com dados de contato, estagio e pipeline
CREATE OR REPLACE VIEW deals_full AS
SELECT
  d.*,
  c.first_name AS contact_first_name,
  c.last_name AS contact_last_name,
  c.email AS contact_email,
  c.phone AS contact_phone,
  c.company AS contact_company,
  s.name AS stage_name,
  s.display_order AS stage_order,
  s.probability AS stage_probability,
  p.name AS pipeline_name,
  EXTRACT(DAY FROM now() - d.stage_entered_at)::INT AS days_in_stage
FROM deals d
LEFT JOIN contacts c ON d.contact_id = c.id
LEFT JOIN stages s ON d.stage_id = s.id
LEFT JOIN pipelines p ON d.pipeline_id = p.id;

-- View: conversao por estagio por produto
CREATE OR REPLACE VIEW stage_conversion AS
SELECT
  p.product,
  s.name AS stage_name,
  s.display_order,
  COUNT(d.id) AS deal_count,
  COALESCE(SUM(d.amount), 0) AS total_amount
FROM stages s
JOIN pipelines p ON s.pipeline_id = p.id
LEFT JOIN deals d ON d.stage_id = s.id AND d.is_won IS NULL
GROUP BY p.product, s.name, s.display_order
ORDER BY p.product, s.display_order;

-- View: tempo medio no estagio (deals fechados)
CREATE OR REPLACE VIEW avg_time_in_stage AS
WITH stage_transitions AS (
  SELECT
    a.id,
    a.deal_id,
    a.created_at,
    d.pipeline_id,
    (a.metadata->>'new_stage_id')::UUID AS stage_id,
    LEAD(a.created_at) OVER (PARTITION BY a.deal_id ORDER BY a.created_at) AS next_created_at
  FROM activities a
  JOIN deals d ON a.deal_id = d.id
  WHERE a.type = 'stage_change'
)
SELECT
  p.product,
  s.name AS stage_name,
  s.display_order,
  COUNT(st.id) AS transitions,
  AVG(
    EXTRACT(EPOCH FROM (st.next_created_at - st.created_at)) / 86400
  )::NUMERIC(10,1) AS avg_days
FROM stage_transitions st
JOIN stages s ON st.stage_id = s.id
JOIN pipelines p ON st.pipeline_id = p.id
WHERE st.next_created_at IS NOT NULL
GROUP BY p.product, s.name, s.display_order
ORDER BY p.product, s.display_order;

-- View: volume MQL por periodo
CREATE OR REPLACE VIEW mql_volume AS
SELECT
  d.product,
  DATE_TRUNC('week', d.created_at)::DATE AS week,
  COUNT(*) FILTER (WHERE d.qualification_status IN ('mql', 'sql')) AS mql_count,
  COUNT(*) AS total_count
FROM deals d
GROUP BY d.product, DATE_TRUNC('week', d.created_at)
ORDER BY week DESC;

-- View: metricas resumo por produto
CREATE OR REPLACE VIEW product_metrics AS
SELECT
  p.product,
  COUNT(d.id) FILTER (WHERE d.is_won IS NULL) AS active_deals,
  COUNT(d.id) FILTER (WHERE d.is_won = true) AS won_deals,
  COUNT(d.id) FILTER (WHERE d.is_won = false) AS lost_deals,
  COALESCE(SUM(d.amount) FILTER (WHERE d.is_won IS NULL), 0) AS pipeline_value,
  COALESCE(AVG(d.amount) FILTER (WHERE d.is_won = true), 0) AS avg_deal_size,
  CASE
    WHEN COUNT(d.id) FILTER (WHERE d.is_won IS NOT NULL) > 0
    THEN (COUNT(d.id) FILTER (WHERE d.is_won = true)::DECIMAL / COUNT(d.id) FILTER (WHERE d.is_won IS NOT NULL) * 100)
    ELSE 0
  END AS win_rate
FROM pipelines p
LEFT JOIN deals d ON d.pipeline_id = p.id
GROUP BY p.product;
