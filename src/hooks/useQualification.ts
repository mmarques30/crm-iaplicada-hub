import type { Contact, QualificationStatus, ProductType } from '@/lib/types'

const MQL_BUSINESS_CARGOS = [
  'CEO / Fundador / Sócio',
  'Diretor / Head',
  'Gerente',
  'Coordenador / Supervisor',
  'Analista',
]

const MQL_SKILLS_CARGOS = [
  'CEO / Fundador / Sócio',
  'Diretor / Head',
  'Gerente',
  'Coordenador / Supervisor',
]

const MQL_SKILLS_LIDERADOS = [
  'Entre 3 e 5 liderados',
  'Entre 5 e 10 liderados',
  'Mais de 10',
]

const MQL_SKILLS_FATURAMENTO = [
  'Entre 5MM e 10MM',
  'Entre 10MM e 50MM',
  'Acima de 50MM',
]

const MQL_ACADEMY_RENDA = [
  'De R$ 4.001 a R$ 8.000',
  'De R$ 8.001 a R$ 12.000',
  'Acima de R$ 12.000',
]

const MQL_ACADEMY_MOTIVO = [
  'Transição de carreira',
  'Promoção/referência profissional',
  'Criar/escalar negócio',
]

const SQL_ACADEMY_OBJETIVO = [
  'Acessar um mentor para acelerar carreira',
  'Acessar treinamento com conteúdos organizados',
]

export function qualifyBusiness(contact: Contact): QualificationStatus {
  const hasCargo = contact.cargo != null && MQL_BUSINESS_CARGOS.includes(contact.cargo)
  const hasFaturamento = contact.faixa_de_faturamento != null && contact.faixa_de_faturamento !== ''

  if (hasCargo && hasFaturamento) {
    return 'mql'
  }

  return 'lead'
}

export function qualifySkills(contact: Contact): QualificationStatus {
  const hasCargo = contact.cargo != null && MQL_SKILLS_CARGOS.includes(contact.cargo)
  const hasLiderados = contact.numero_de_liderados != null && MQL_SKILLS_LIDERADOS.includes(contact.numero_de_liderados)
  const hasFaturamento = contact.faixa_de_faturamento != null && MQL_SKILLS_FATURAMENTO.includes(contact.faixa_de_faturamento)

  if (hasCargo && hasLiderados && hasFaturamento) {
    return 'mql'
  }

  return 'lead'
}

export function qualifyAcademy(contact: Contact): QualificationStatus {
  const hasRenda = contact.renda_mensal != null && MQL_ACADEMY_RENDA.includes(contact.renda_mensal)
  const hasMotivo = contact.motivo_para_aprender_ia != null && MQL_ACADEMY_MOTIVO.includes(contact.motivo_para_aprender_ia)

  if (!hasRenda || !hasMotivo) {
    return 'lead'
  }

  // MQL criteria met — check for SQL
  const hasObjetivo = contact.objetivo_com_a_comunidade != null && SQL_ACADEMY_OBJETIVO.includes(contact.objetivo_com_a_comunidade)

  if (hasObjetivo) {
    return 'sql'
  }

  return 'mql'
}

export function qualifyContact(contact: Contact, product: ProductType): QualificationStatus {
  switch (product) {
    case 'business':
      return qualifyBusiness(contact)
    case 'skills':
      return qualifySkills(contact)
    case 'academy':
      return qualifyAcademy(contact)
    default:
      return 'lead'
  }
}
