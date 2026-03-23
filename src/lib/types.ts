export type ProductType = 'business' | 'skills' | 'academy'
export type QualificationStatus = 'lead' | 'mql' | 'sql'
export type ActivityType = 'email' | 'whatsapp' | 'call' | 'meeting' | 'note' | 'stage_change'
export type ActivityDirection = 'inbound' | 'outbound'

export interface Pipeline {
  id: string
  name: string
  product: ProductType
  created_at: string
}

export interface Stage {
  id: string
  pipeline_id: string
  name: string
  display_order: number
  probability: number
  created_at: string
}

export interface Contact {
  id: string
  hubspot_id: number | null
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  cargo: string | null
  numero_de_liderados: string | null
  faixa_de_faturamento: string | null
  renda_mensal: string | null
  motivo_para_aprender_ia: string | null
  objetivo_com_a_comunidade: string | null
  produto_interesse: ProductType[] | null
  manychat_id: string | null
  whatsapp_opt_in: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  hubspot_id: number | null
  name: string
  contact_id: string | null
  pipeline_id: string
  stage_id: string
  product: ProductType
  amount: number | null
  qualification_status: QualificationStatus
  canal_origem: string | null
  motivo_perda: string | null
  ultimo_contato: string | null
  stage_entered_at: string
  owner_id: string | null
  closed_at: string | null
  is_won: boolean | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  contact_id: string | null
  deal_id: string | null
  type: ActivityType
  direction: ActivityDirection | null
  subject: string | null
  body: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

export interface EmailTemplate {
  id: string
  product: ProductType
  sequence_order: number
  subject: string
  body_html: string
  delay_days: number
  created_at: string
}

export interface StaleAlertConfig {
  pipeline_id: string
  stage_id: string
  threshold_days: number
}

// Qualification criteria types
export interface QualificationCriteria {
  product: ProductType
  level: 'mql' | 'sql'
  rules: QualificationRule[]
}

export interface QualificationRule {
  field: keyof Contact
  operator: 'in' | 'not_null' | 'equals'
  values?: string[]
}

// Deal with joined data for display
export interface DealWithRelations extends Deal {
  contact?: Contact
  stage?: Stage
  pipeline?: Pipeline
}

export interface ContactWithDeals extends Contact {
  deals?: Deal[]
}
