import { describe, expect, it } from 'vitest'
import configuredPath from '../src/main/configuredPath.js'

const { normalizeConfiguredPath, normalizeConfigPaths } = configuredPath

describe('configured path normalization', () => {
  it.each([
    ['C:\\testes\\script.bat', 'C:\\testes\\script.bat'],
    ['C:\\Pasta Com Espaço\\script.bat', 'C:\\Pasta Com Espaço\\script.bat'],
    ['"C:\\Pasta Com Espaço\\script.bat"', 'C:\\Pasta Com Espaço\\script.bat'],
    ['  "C:\\Pasta Com Espaço\\script.bat"  ', 'C:\\Pasta Com Espaço\\script.bat'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeConfiguredPath(input)).toEqual({ ok: true, value: expected })
  })

  it('rejeita aspas externas incompletas', () => {
    expect(normalizeConfiguredPath('"C:\\Pasta\\script.bat')).toMatchObject({ ok: false })
    expect(normalizeConfiguredPath('C:\\Pasta\\script.bat"')).toMatchObject({ ok: false })
  })

  it('preserva argumentos separados do path', () => {
    const config = {
      deploy: {
        categories: [{ softwares: [{ path: '  "C:\\Pasta Com Espaço\\script.bat" ', args: '/modo teste' }] }],
      },
    }
    expect(normalizeConfigPaths(config).config.deploy.categories[0].softwares[0]).toEqual({
      path: 'C:\\Pasta Com Espaço\\script.bat',
      args: '/modo teste',
    })
  })

  it('não aceita aspas internas como comando disfarçado', () => {
    expect(normalizeConfiguredPath('"C:\\Pasta\\script.bat" /arg')).toMatchObject({ ok: false })
  })
})
