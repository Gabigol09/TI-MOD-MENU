import { describe, expect, it } from 'vitest'
import hostname from '../src/main/hostname.js'

const { validateHostname, isNotebookHostname } = hostname
const pattern = '^[A-Za-z]{2}\\d{5}S$'

describe('validateHostname', () => {
  it('aceita hostname compatível', () => {
    expect(validateHostname('AB12345S', pattern)).toEqual({ status: 'match' })
  })

  it('rejeita hostname incompatível', () => {
    expect(validateHostname('FORA-DO-PADRAO', pattern)).toEqual({ status: 'mismatch' })
  })

  it('trata hostname indisponível antes da regra', () => {
    expect(validateHostname('  ', '[')).toEqual({ status: 'unavailable' })
  })

  it('desabilita validação com regra vazia ou opcional', () => {
    expect(validateHostname('AB12345S', '  ')).toEqual({ status: 'disabled' })
  })

  it('diferencia regex inválida de mismatch', () => {
    const result = validateHostname('AB12345S', '[')
    expect(result.status).toBe('invalid-pattern')
    expect(result.error).toBeTypeOf('string')
  })
})

describe('isNotebookHostname', () => {
  it('classifica prefixo sem diferenciar maiúsculas', () => {
    expect(isNotebookHostname('nb12345s', 'NB')).toBe(true)
  })

  it('classifica hostname sem o prefixo como desktop', () => {
    expect(isNotebookHostname('PC12345S', 'NB')).toBe(false)
  })

  it('preserva o prefixo padrão NB', () => {
    expect(isNotebookHostname('NB12345S', '')).toBe(true)
  })
})
