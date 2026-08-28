import { describe, expect, it } from 'vitest'
const { createSoftwareInventoryService, validateInventoryPayload } = require('../src/main/softwareInventoryService')

describe('software inventory service e ipc', () => {
  it('valida payload com ou sem options', () => {
    expect(validateInventoryPayload({})).toBe(true)
    expect(validateInventoryPayload({ refresh: true })).toBe(true)
    expect(validateInventoryPayload({ refresh: false })).toBe(true)
    expect(validateInventoryPayload({ unknown: true })).toBe(false)
    expect(validateInventoryPayload(null)).toBe(false)
  })

  it('agrupa fontes no provider e formata sucesso', async () => {
    const provider = async () => ({
      entries: [{ values: { DisplayName: 'App A' }, source: 'hklm64', scope: 'machine', architecture: '64-bit' }],
      warnings: [],
      succeededSources: 4,
      totalSources: 4,
    })
    const service = createSoftwareInventoryService({ provider })
    const result = await service.getInventory()
    expect(result.ok).toBe(true)
    expect(result.status).toBe('success')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].displayName).toBe('App A')
    expect(result.sources).toMatchObject({ succeeded: 4, total: 4 })
    expect(result.cached).toBe(false)
  })

  it('diferencia falha parcial reportando warnings', async () => {
    const provider = async () => ({
      entries: [{ values: { DisplayName: 'App A' }, source: 'hklm64', scope: 'machine', architecture: '64-bit' }],
      warnings: [{ source: 'hkcu32', code: 'SOURCE_UNAVAILABLE', message: 'falha' }],
      succeededSources: 3,
      totalSources: 4,
    })
    const service = createSoftwareInventoryService({ provider })
    const result = await service.getInventory()
    expect(result.ok).toBe(true)
    expect(result.status).toBe('partial')
    expect(result.warnings).toHaveLength(1)
    expect(result.items).toHaveLength(1)
  })

  it('falha total quando todas as fontes quebram e nao cria cache', async () => {
    let calls = 0
    const provider = async () => {
      calls++
      return { entries: [], warnings: [{}], succeededSources: 0, totalSources: 4 }
    }
    const service = createSoftwareInventoryService({ provider })
    const result1 = await service.getInventory()
    expect(result1.ok).toBe(false)
    expect(result1.status).toBe('error')
    expect(result1.items).toEqual([])
    
    await service.getInventory()
    expect(calls).toBe(2)
  })

  it('cria cache, reaproveita se estiver no ttl e expira depois do ttl', async () => {
    let calls = 0
    let currentTime = 1000
    const provider = async () => {
      calls++
      return { entries: [], warnings: [], succeededSources: 4, totalSources: 4 }
    }
    const service = createSoftwareInventoryService({ provider, now: () => currentTime, cacheTtlMs: 5000 })
    
    const r1 = await service.getInventory()
    expect(r1.cached).toBe(false)
    expect(calls).toBe(1)

    currentTime = 3000
    const r2 = await service.getInventory()
    expect(r2.cached).toBe(true)
    expect(calls).toBe(1)

    currentTime = 7000
    const r3 = await service.getInventory()
    expect(r3.cached).toBe(false)
    expect(calls).toBe(2)
  })

  it('ignora cache e forca request quando refresh e true', async () => {
    let calls = 0
    const provider = async () => {
      calls++
      return { entries: [], warnings: [], succeededSources: 4, totalSources: 4 }
    }
    const service = createSoftwareInventoryService({ provider, now: () => 1000, cacheTtlMs: 5000 })
    
    await service.getInventory()
    expect(calls).toBe(1)
    const r2 = await service.getInventory({ refresh: true })
    expect(r2.cached).toBe(false)
    expect(calls).toBe(2)
  })

  it('permite matching do inventario retornado contra catalogo existente', async () => {
    const provider = async () => ({
      entries: [{ values: { DisplayName: 'App B', Publisher: 'Corp' }, source: 'hklm64', scope: 'machine', architecture: '64-bit' }],
      warnings: [], succeededSources: 4, totalSources: 4,
    })
    const service = createSoftwareInventoryService({ provider })
    const { items } = await service.getInventory()
    const match = service.match({ name: 'App B' }, items)
    expect(match.status).toBe('installed')
    expect(match.matches[0].publisher).toBe('Corp')
  })
})
