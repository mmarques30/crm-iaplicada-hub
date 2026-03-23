import { describe, it, expect } from 'vitest'
import {
  qualifyBusiness,
  qualifySkills,
  qualifyAcademy,
  qualifyContact,
} from '../hooks/useQualification'
import type { Contact } from '../lib/types'

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'test-id',
    hubspot_id: null,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@test.com',
    phone: null,
    company: null,
    cargo: null,
    numero_de_liderados: null,
    faixa_de_faturamento: null,
    renda_mensal: null,
    motivo_para_aprender_ia: null,
    objetivo_com_a_comunidade: null,
    produto_interesse: null,
    manychat_id: null,
    whatsapp_opt_in: false,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    owner_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('Qualificacao Business', () => {
  it('retorna lead quando cargo nao e valido', () => {
    const contact = makeContact({ cargo: 'Estagiario', faixa_de_faturamento: 'Acima de 50MM' })
    expect(qualifyBusiness(contact)).toBe('lead')
  })

  it('retorna lead quando faturamento e vazio', () => {
    const contact = makeContact({ cargo: 'CEO / Fundador / Sócio', faixa_de_faturamento: null })
    expect(qualifyBusiness(contact)).toBe('lead')
  })

  it('retorna mql para CEO com faturamento', () => {
    const contact = makeContact({ cargo: 'CEO / Fundador / Sócio', faixa_de_faturamento: 'Menos de R$ 1 milhão' })
    expect(qualifyBusiness(contact)).toBe('mql')
  })

  it('retorna mql para Analista com faturamento', () => {
    const contact = makeContact({ cargo: 'Analista', faixa_de_faturamento: 'Entre 10MM e 50MM' })
    expect(qualifyBusiness(contact)).toBe('mql')
  })

  it('retorna mql para Gerente com faturamento', () => {
    const contact = makeContact({ cargo: 'Gerente', faixa_de_faturamento: 'Entre 1MM e 5MM' })
    expect(qualifyBusiness(contact)).toBe('mql')
  })
})

describe('Qualificacao Skills', () => {
  it('retorna lead quando cargo nao e valido (Analista nao qualifica)', () => {
    const contact = makeContact({
      cargo: 'Analista',
      numero_de_liderados: 'Entre 5 e 10 liderados',
      faixa_de_faturamento: 'Acima de 50MM',
    })
    expect(qualifySkills(contact)).toBe('lead')
  })

  it('retorna lead quando liderados sao poucos', () => {
    const contact = makeContact({
      cargo: 'Diretor / Head',
      numero_de_liderados: 'Menos de 3 liderados',
      faixa_de_faturamento: 'Acima de 50MM',
    })
    expect(qualifySkills(contact)).toBe('lead')
  })

  it('retorna lead quando faturamento e baixo', () => {
    const contact = makeContact({
      cargo: 'Gerente',
      numero_de_liderados: 'Mais de 10',
      faixa_de_faturamento: 'Entre 1MM e 5MM',
    })
    expect(qualifySkills(contact)).toBe('lead')
  })

  it('retorna mql quando todos criterios sao atendidos', () => {
    const contact = makeContact({
      cargo: 'Diretor / Head',
      numero_de_liderados: 'Entre 5 e 10 liderados',
      faixa_de_faturamento: 'Entre 10MM e 50MM',
    })
    expect(qualifySkills(contact)).toBe('mql')
  })

  it('retorna mql para Coordenador com criterios corretos', () => {
    const contact = makeContact({
      cargo: 'Coordenador / Supervisor',
      numero_de_liderados: 'Entre 3 e 5 liderados',
      faixa_de_faturamento: 'Entre 5MM e 10MM',
    })
    expect(qualifySkills(contact)).toBe('mql')
  })
})

describe('Qualificacao Academy', () => {
  it('retorna lead quando renda e baixa', () => {
    const contact = makeContact({
      renda_mensal: 'De R$ 1.000 a R$ 4.000',
      motivo_para_aprender_ia: 'Transição de carreira',
    })
    expect(qualifyAcademy(contact)).toBe('lead')
  })

  it('retorna lead quando motivo nao qualifica', () => {
    const contact = makeContact({
      renda_mensal: 'Acima de R$ 12.000',
      motivo_para_aprender_ia: 'Curiosidade',
    })
    expect(qualifyAcademy(contact)).toBe('lead')
  })

  it('retorna mql quando renda e motivo qualificam', () => {
    const contact = makeContact({
      renda_mensal: 'De R$ 4.001 a R$ 8.000',
      motivo_para_aprender_ia: 'Transição de carreira',
    })
    expect(qualifyAcademy(contact)).toBe('mql')
  })

  it('retorna sql quando objetivo qualifica alem de MQL', () => {
    const contact = makeContact({
      renda_mensal: 'De R$ 8.001 a R$ 12.000',
      motivo_para_aprender_ia: 'Promoção/referência profissional',
      objetivo_com_a_comunidade: 'Acessar um mentor para acelerar carreira',
    })
    expect(qualifyAcademy(contact)).toBe('sql')
  })

  it('retorna sql para treinamento organizado', () => {
    const contact = makeContact({
      renda_mensal: 'Acima de R$ 12.000',
      motivo_para_aprender_ia: 'Criar/escalar negócio',
      objetivo_com_a_comunidade: 'Acessar treinamento com conteúdos organizados',
    })
    expect(qualifyAcademy(contact)).toBe('sql')
  })

  it('retorna mql quando objetivo nao qualifica para SQL', () => {
    const contact = makeContact({
      renda_mensal: 'De R$ 4.001 a R$ 8.000',
      motivo_para_aprender_ia: 'Transição de carreira',
      objetivo_com_a_comunidade: 'Networking',
    })
    expect(qualifyAcademy(contact)).toBe('mql')
  })
})

describe('qualifyContact (dispatcher)', () => {
  it('roteia para business corretamente', () => {
    const contact = makeContact({ cargo: 'Gerente', faixa_de_faturamento: 'Acima de 50MM' })
    expect(qualifyContact(contact, 'business')).toBe('mql')
  })

  it('roteia para skills corretamente', () => {
    const contact = makeContact({
      cargo: 'Gerente',
      numero_de_liderados: 'Mais de 10',
      faixa_de_faturamento: 'Acima de 50MM',
    })
    expect(qualifyContact(contact, 'skills')).toBe('mql')
  })

  it('roteia para academy corretamente', () => {
    const contact = makeContact({
      renda_mensal: 'Acima de R$ 12.000',
      motivo_para_aprender_ia: 'Criar/escalar negócio',
      objetivo_com_a_comunidade: 'Acessar treinamento com conteúdos organizados',
    })
    expect(qualifyContact(contact, 'academy')).toBe('sql')
  })
})
