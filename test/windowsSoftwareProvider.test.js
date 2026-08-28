import { describe, expect, it } from 'vitest'
const { WINDOWS_SOFTWARE_SOURCES, parseRegistryQueryOutput, readWindowsSoftwareSources } = require('../src/main/windowsSoftwareProvider')

const source = WINDOWS_SOFTWARE_SOURCES[0]
const output = `
HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AppA
    DisplayName    REG_SZ    Aplicativo Exemplo
    DisplayVersion    REG_SZ    2.1.0
    Publisher    REG_SZ    Empresa Exemplo
    InstallLocation    REG_SZ    C:\\Apps\\Exemplo
    UninstallString    REG_SZ    "C:\\Apps\\Exemplo\\remove.exe"

HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Incomplete
    Publisher    REG_SZ    Outro Publicador
`

describe('windows software provider', () => {
  it('declara fontes de máquina e usuário nas views 32 e 64 bits', () => {
    expect(WINDOWS_SOFTWARE_SOURCES.map(item => item.id)).toEqual(['hklm64', 'hklm32', 'hkcu64', 'hkcu32'])
  })

  it('converte saída do reg query em entradas sem executar metadados de uninstall', () => {
    const entries = parseRegistryQueryOutput(output, source)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ source: 'hklm64', scope: 'machine', architecture: '64-bit', values: { DisplayName: 'Aplicativo Exemplo', DisplayVersion: '2.1.0' } })
    expect(entries[0].internal.UninstallString).toContain('remove.exe')
    expect(entries[0]).not.toHaveProperty('command')
  })

  it('agrega fonte vazia e fontes 32/64-bit sem Registry real', async () => {
    const sources = WINDOWS_SOFTWARE_SOURCES.slice(0, 3)
    const result = await readWindowsSoftwareSources({ sources, query: async item => item.id === 'hklm32' ? [] : parseRegistryQueryOutput(output, item).slice(0, 1) })
    expect(result.entries).toHaveLength(2)
    expect(result.succeededSources).toBe(3)
    expect(result.warnings).toEqual([])
  })

  it('preserva resultado parcial quando uma fonte falha', async () => {
    const sources = WINDOWS_SOFTWARE_SOURCES.slice(0, 2)
    const result = await readWindowsSoftwareSources({ sources, query: async item => {
      if (item.id === 'hklm32') throw new Error('fonte indisponível')
      return parseRegistryQueryOutput(output, item).slice(0, 1)
    } })
    expect(result.entries).toHaveLength(1)
    expect(result.succeededSources).toBe(1)
    expect(result.warnings).toEqual([{ source: 'hklm32', code: 'SOURCE_UNAVAILABLE', message: 'fonte indisponível' }])
  })

  it('diferencia falha total de inventário vazio real', async () => {
    const sources = WINDOWS_SOFTWARE_SOURCES.slice(0, 2)
    const empty = await readWindowsSoftwareSources({ sources, query: async () => [] })
    const failed = await readWindowsSoftwareSources({ sources, query: async () => { throw new Error('erro') } })
    expect(empty).toMatchObject({ entries: [], succeededSources: 2, warnings: [] })
    expect(failed).toMatchObject({ entries: [], succeededSources: 0 })
    expect(failed.warnings).toHaveLength(2)
  })
})
