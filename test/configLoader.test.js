import { describe, expect, it } from 'vitest'
import configLoader from '../src/main/configLoader.js'

const { DEFAULTS, deepMerge, validateConfig } = configLoader

describe('deepMerge', () => {
  it('mantém defaults ao aplicar configuração parcial válida', () => {
    const result = deepMerge(DEFAULTS, { network: { softDrive: 'T:' } })

    expect(result.network.softDrive).toBe('T:')
    expect(result.network.softServer).toBe(DEFAULTS.network.softServer)
    expect(result.paths.office365).toBe(DEFAULTS.paths.office365)
  })

  it('substitui arrays de deploy em vez de mesclar posições', () => {
    const categories = [{ id: 'custom', name: 'Custom', softwares: [] }]
    const result = deepMerge(DEFAULTS, { deploy: { categories } })

    expect(result.deploy.categories).toEqual(categories)
    expect(result.deploy.categories).not.toBe(DEFAULTS.deploy.categories)
  })

  it('preserva chaves adicionais sem mutar a base', () => {
    const base = { section: { enabled: true } }
    const override = { section: { name: 'teste' }, extra: 1 }

    expect(deepMerge(base, override)).toEqual({ section: { enabled: true, name: 'teste' }, extra: 1 })
    expect(base).toEqual({ section: { enabled: true } })
  })
})

describe('validateConfig', () => {
  it('aceita configuração com regex válida', () => {
    expect(validateConfig({ hostname: { pattern: '^NB\\d+$' } })).toEqual({ ok: true, errors: [], referenceErrors: [] })
  })

  it('aceita regra opcional vazia', () => {
    expect(validateConfig({ hostname: { pattern: '' } })).toEqual({ ok: true, errors: [], referenceErrors: [] })
  })

  it('rejeita configuração com regex inválida', () => {
    const result = validateConfig({ hostname: { pattern: '[' } })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('hostname.pattern')
    expect(result.errors[0].reason).toContain('regex inválida')
  })
})
