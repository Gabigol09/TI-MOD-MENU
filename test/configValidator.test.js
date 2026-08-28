import { describe, expect, it } from 'vitest'
import configLoader from '../src/main/configLoader.js'
import configValidator from '../src/main/configValidator.js'

const { DEFAULTS, deepMerge, validateConfig: validateThroughLoader } = configLoader
const { validateConfig, toValidationResponse } = configValidator

function expectField(result, field) {
  expect(result.valid).toBe(false)
  expect(result.errors.some(error => error.field === field && error.reason)).toBe(true)
}

describe('configValidator', () => {
  it('aceita a configuração padrão atual', () => {
    expect(validateConfig(DEFAULTS)).toEqual({ valid: true, errors: [], referenceErrors: [] })
  })

  it('aceita configuração parcial após aplicar defaults', () => {
    const config = deepMerge(DEFAULTS, { network: { softDrive: 'T:' } })
    expect(validateConfig(config).valid).toBe(true)
  })

  it('aceita regex de hostname válida e opcional vazia', () => {
    expect(validateConfig(deepMerge(DEFAULTS, { hostname: { pattern: '^NB\\d+$' } })).valid).toBe(true)
    expect(validateConfig(deepMerge(DEFAULTS, { hostname: { pattern: '' } })).valid).toBe(true)
  })

  it('rejeita regex inválida com campo e motivo', () => {
    expectField(validateConfig(deepMerge(DEFAULTS, { hostname: { pattern: '[' } })), 'hostname.pattern')
  })

  it('rejeita seção com tipo errado', () => {
    expectField(validateConfig({ ...DEFAULTS, network: 'S:' }), 'network')
  })

  it.each(['S:', 's:', 'T', ''])('aceita unidade suportada %j', softDrive => {
    expect(validateConfig(deepMerge(DEFAULTS, { network: { softDrive } })).valid).toBe(true)
  })

  it('rejeita unidade inválida', () => {
    expectField(validateConfig(deepMerge(DEFAULTS, { network: { softDrive: 'SOFT:' } })), 'network.softDrive')
  })

  it('aceita path string mesmo quando representa UNC offline', () => {
    const config = deepMerge(DEFAULTS, { paths: { chrome: '\\\\servidor-offline\\soft\\setup.exe' } })
    expect(validateConfig(config).valid).toBe(true)
  })

  it('rejeita path com tipo incorreto', () => {
    expectField(validateConfig(deepMerge(DEFAULTS, { paths: { chrome: 123 } })), 'paths.chrome')
  })

  it('aceita argumento string no catálogo Deploy', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'App', path: 'C:\\setup.exe', args: '/S' }] }] },
    })
    expect(validateConfig(config).valid).toBe(true)
  })

  it('aceita baseline opcional booleano no catálogo Deploy', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'App', path: 'C:\\setup.exe', defaultForPreparation: true }] }] },
    })
    expect(validateConfig(config).valid).toBe(true)
  })

  it.each([true, false])('aceita showConsole booleano %s', showConsole => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'Script', path: 'C:\\teste.bat', type: 'script', showConsole }] }] },
    })
    expect(validateConfig(config).valid).toBe(true)
  })

  it('mantém configuração antiga sem showConsole válida', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'Script', path: 'C:\\teste.bat', type: 'script' }] }] },
    })
    expect(validateConfig(config).valid).toBe(true)
  })

  it('rejeita showConsole com tipo incorreto', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'Script', path: 'C:\\teste.bat', type: 'script', showConsole: 'sim' }] }] },
    })
    expectField(validateConfig(config), 'deploy.categories[0].softwares[0].showConsole')
  })

  it('rejeita baseline com tipo incorreto', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'App', path: 'C:\\setup.exe', defaultForPreparation: 'sim' }] }] },
    })
    expectField(validateConfig(config), 'deploy.categories[0].softwares[0].defaultForPreparation')
  })

  it('rejeita argumento com tipo incorreto', () => {
    const config = deepMerge(DEFAULTS, {
      deploy: { categories: [{ id: 'cat', name: 'Categoria', softwares: [{ id: 'soft', name: 'App', path: 'C:\\setup.exe', args: [] }] }] },
    })
    expectField(validateConfig(config), 'deploy.categories[0].softwares[0].args')
  })

  it('aceita catálogo Deploy válido e vazio', () => {
    expect(validateConfig(deepMerge(DEFAULTS, { deploy: { categories: [] } })).valid).toBe(true)
  })

  it.each([{}, null, 'texto'])('rejeita catálogo Deploy estruturalmente inválido sem lançar para categories = %j', categories => {
    const config = deepMerge(DEFAULTS, { deploy: { categories }, preparationProfile: { enabled: true } })
    expect(() => validateConfig(config)).not.toThrow()
    expectField(validateConfig(config), 'deploy.categories')
  })

  it('preserva e não rejeita campos desconhecidos', () => {
    const config = deepMerge(DEFAULTS, { future: { enabled: true }, network: { futureOption: 42 } })
    expect(config.future).toEqual({ enabled: true })
    expect(config.network.futureOption).toBe(42)
    expect(validateConfig(config).valid).toBe(true)
  })

  it('é pura e não executa rede, filesystem ou comandos', () => {
    const config = deepMerge(DEFAULTS, { paths: { chrome: '\\\\servidor-offline\\soft\\setup.exe' } })
    const before = JSON.stringify(config)
    validateConfig(config)
    expect(JSON.stringify(config)).toBe(before)
  })

  it('expõe a mesma resposta central usada pelo loader e pela UI via IPC', () => {
    const config = { hostname: { pattern: '[' } }
    const expected = toValidationResponse(validateConfig(deepMerge(DEFAULTS, config)))
    expect(validateThroughLoader(config)).toEqual(expected)
  })
})
