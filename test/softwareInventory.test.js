import { describe, expect, it } from 'vitest'
const { normalizeSoftwareEntry, normalizeAndDeduplicate, matchCatalogItem } = require('../src/main/softwareInventory')

function raw(name, opts = {}) {
  return {
    registryKey: opts.key || 'HKEY_LOCAL_MACHINE\\Software\\' + name,
    source: opts.source || 'hklm64',
    scope: opts.scope || 'machine',
    architecture: opts.architecture || '64-bit',
    values: { DisplayName: name, DisplayVersion: opts.version, Publisher: opts.publisher, InstallLocation: opts.location },
  }
}

describe('software inventory normalization', () => {
  it('normaliza whitespace, casing e versao, publisher e location ausente', () => {
    const item = normalizeSoftwareEntry(raw('  Aplicativo Exemplo  ', { version: ' v2.0 ', publisher: ' EDITORA X ' }))
    expect(item).toMatchObject({ displayName: 'Aplicativo Exemplo', displayVersion: 'v2.0', publisher: 'EDITORA X', installLocation: null })
    expect(item.comparison).toMatchObject({ name: 'aplicativo exemplo', version: '2.0', publisher: 'editora x', installLocation: null })
  })

  it('ignora registros incompletos sem DisplayName', () => {
    expect(normalizeSoftwareEntry({ source: 'hklm64', values: { Publisher: 'X' } })).toBeNull()
    expect(normalizeSoftwareEntry({ source: 'hklm64', values: { DisplayName: '   ' } })).toBeNull()
  })

  it('deduplica replica 32/64-bit com mesma identidade e agrega fontes', () => {
    const entries = [
      raw('App A', { version: '1.0', publisher: 'Editora', source: 'hklm64', scope: 'machine' }),
      raw('App A', { version: '1.0', publisher: 'Editora', source: 'hklm32', scope: 'machine', architecture: '32-bit' }),
    ]
    const result = normalizeAndDeduplicate(entries)
    expect(result).toHaveLength(1)
    expect(result[0].sources.sort()).toEqual(['hklm32', 'hklm64'].sort())
    expect(result[0].architecture).toBe('multiple')
  })

  it('preserva entradas com mesmo nome mas publishers distintos como separadas', () => {
    const entries = [
      raw('App B', { version: '1.0', publisher: 'Editora A', source: 'hklm64', scope: 'machine' }),
      raw('App B', { version: '1.0', publisher: 'Editora B', source: 'hklm64', scope: 'machine' }),
    ]
    const result = normalizeAndDeduplicate(entries)
    expect(result).toHaveLength(2)
  })

  it('mantem versoes diferentes como entradas separadas', () => {
    const entries = [
      raw('App C', { version: '1.0', publisher: 'Editora', source: 'hklm64', scope: 'machine' }),
      raw('App C', { version: '2.0', publisher: 'Editora', source: 'hklm64', scope: 'machine' }),
    ]
    const result = normalizeAndDeduplicate(entries)
    expect(result).toHaveLength(2)
  })

  it('descarta entrada com DisplayName vazio retornando null e nao quebra o batch', () => {
    const entries = [
      raw('', { source: 'hklm64', scope: 'machine' }),
      raw('App D', { source: 'hklm64', scope: 'machine' }),
    ]
    const result = normalizeAndDeduplicate(entries)
    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('App D')
  })

  it('machine e user com mesmo nome ficam separados por scope', () => {
    const entries = [
      raw('App E', { version: '1.0', publisher: 'Editora', source: 'hklm64', scope: 'machine' }),
      raw('App E', { version: '1.0', publisher: 'Editora', source: 'hkcu64', scope: 'user' }),
    ]
    const result = normalizeAndDeduplicate(entries)
    expect(result).toHaveLength(2)
  })
})

describe('software inventory matching', () => {
  const inventory = [
    { displayName: 'App Alfa', displayVersion: '3.0', publisher: 'Editora Alfa', comparison: { name: 'app alfa', version: '3.0', publisher: 'editora alfa', installLocation: null }, source: 'hklm64', sources: ['hklm64'] },
    { displayName: 'App Beta', displayVersion: '1.2', publisher: 'Editora Alfa', comparison: { name: 'app beta', version: '1.2', publisher: 'editora alfa', installLocation: null }, source: 'hklm64', sources: ['hklm64'] },
    { displayName: 'App Beta', displayVersion: '2.0', publisher: 'Editora Beta', comparison: { name: 'app beta', version: '2.0', publisher: 'editora beta', installLocation: null }, source: 'hklm64', sources: ['hklm64'] },
    { displayName: 'App Gamma', displayVersion: null, publisher: null, comparison: { name: 'app gamma', version: null, publisher: null, installLocation: null }, source: 'hklm64', sources: ['hklm64'] },
  ]

  it('match confiavel por nome exato e publisher singular', () => {
    const result = matchCatalogItem({ name: 'App Alfa' }, inventory)
    expect(result.status).toBe('installed')
    expect(result.reason).toBe('EXACT_MATCH')
  })

  it('ambiguo quando mesmo nome tem publishers diferentes', () => {
    const result = matchCatalogItem({ name: 'App Beta' }, inventory)
    expect(result.status).toBe('ambiguous')
    expect(result.reason).toBe('MULTIPLE_PUBLISHERS')
  })

  it('match confiavel com detecao explicita por publisher', () => {
    const result = matchCatalogItem({ name: 'App Beta', detection: { displayName: 'App Beta', publisher: 'Editora Alfa' } }, inventory)
    expect(result.status).toBe('installed')
    expect(result.matches[0].publisher).toBe('Editora Alfa')
  })

  it('notInstalled quando publisher explicito diverge', () => {
    const result = matchCatalogItem({ name: 'App Beta', detection: { displayName: 'App Beta', publisher: 'Editora Inexistente' } }, inventory)
    expect(result.status).toBe('notInstalled')
    expect(result.reason).toBe('PUBLISHER_MISMATCH')
  })

  it('notInstalled quando software genuinamente ausente', () => {
    const result = matchCatalogItem({ name: 'App Inexistente' }, inventory)
    expect(result.status).toBe('notInstalled')
    expect(result.reason).toBe('NO_EXACT_NAME_MATCH')
  })

  it('unknown quando criterios sao insuficientes', () => {
    const result = matchCatalogItem({}, inventory)
    expect(result.status).toBe('unknown')
    expect(result.reason).toBe('INSUFFICIENT_CRITERIA')
  })

  it('unknown nao passa notInstalled por nome parecido mas diferente', () => {
    const result = matchCatalogItem({ name: 'App Alf' }, inventory)
    expect(result.status).toBe('notInstalled')
    expect(result.reason).toBe('NO_EXACT_NAME_MATCH')
  })

  it('versao divergente com deteccao explicita retorna notInstalled', () => {
    const result = matchCatalogItem({ name: 'App Alfa', detection: { displayName: 'App Alfa', publisher: 'Editora Alfa', version: '2.0' } }, inventory)
    expect(result.status).toBe('notInstalled')
    expect(result.reason).toBe('VERSION_MISMATCH')
  })

  it('dados insuficientes no inventario retornam installed se nome e publisher batem', () => {
    const result = matchCatalogItem({ name: 'App Gamma' }, inventory)
    expect(result.status).toBe('installed')
  })
})
