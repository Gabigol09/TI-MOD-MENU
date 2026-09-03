import { describe, expect, it, vi } from 'vitest'
import {
  buildDynamicUninstallList,
  NATIVE_FALLBACKS,
  openNativeFallback,
  REMOVAL_STRATEGY,
  UNINSTALL_STATUS,
} from '../src/shared/dynamicUninstall.js'
import { matchCatalogItem as sharedMatchCatalogItem } from '../src/shared/softwareInventoryMatcher.js'
import mainInventory from '../src/main/softwareInventory.js'

describe('dynamic uninstall module', () => {
  it('mantém o adapter do renderer semanticamente alinhado à fundação de inventário', () => {
    const inventory = [
      { comparison: { name: 'app', publisher: 'a', version: '1' } },
      { comparison: { name: 'app', publisher: 'b', version: '2' } },
    ]
    const catalogItem = { name: 'App' }

    expect(sharedMatchCatalogItem(catalogItem, inventory)).toEqual(mainInventory.matchCatalogItem(catalogItem, inventory))
  })

  const sampleCategories = [
    {
      id: 'cat-basic',
      name: 'Básicos',
      softwares: [
        { id: 'soft-chrome', name: 'Google Chrome', type: 'open', path: '\\\\server\\chrome.exe' },
        { id: 'soft-7zip', name: '7-Zip', type: 'exe', path: '\\\\server\\7z.exe' },
      ],
    },
    {
      id: 'cat-office',
      name: 'Produtividade',
      softwares: [
        { id: 'soft-office', name: 'Microsoft 365', type: 'path', path: '\\\\server\\office.exe' },
        { id: 'soft-ambiguous', name: 'App Ambíguo', type: 'exe', path: '\\\\server\\amb.exe' },
      ],
    },
  ]

  const mockInventory = [
    {
      displayName: 'Google Chrome',
      displayVersion: '128.0.0.0',
      publisher: 'Google LLC',
      comparison: { name: 'google chrome', version: '128.0.0.0', publisher: 'google llc' },
      source: 'hklm64',
    },
    {
      displayName: 'App Ambíguo',
      displayVersion: '1.0',
      publisher: 'Publisher A',
      comparison: { name: 'app ambíguo', version: '1.0', publisher: 'publisher a' },
      source: 'hklm64',
    },
    {
      displayName: 'App Ambíguo',
      displayVersion: '2.0',
      publisher: 'Publisher B',
      comparison: { name: 'app ambíguo', version: '2.0', publisher: 'publisher b' },
      source: 'hklm32',
    },
  ]

  it('1. catálogo + installed: identifica software instalado e marca como no_strategy', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const chrome = res.items.find(i => i.id === 'soft-chrome')

    expect(chrome).toBeDefined()
    expect(chrome.status).toBe(UNINSTALL_STATUS.NO_STRATEGY)
    expect(chrome.rawMatchStatus).toBe('installed')
    expect(chrome.version).toBe('128.0.0.0')
    expect(chrome.publisher).toBe('Google LLC')
    expect(chrome.canDirectRemove).toBe(false)
    expect(chrome.removalStrategy).toBe(REMOVAL_STRATEGY.NONE)
  })

  it('2. catálogo + notInstalled: identifica software ausente', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const zip = res.items.find(i => i.id === 'soft-7zip')

    expect(zip).toBeDefined()
    expect(zip.status).toBe(UNINSTALL_STATUS.NOT_INSTALLED)
    expect(zip.rawMatchStatus).toBe('notInstalled')
    expect(zip.canDirectRemove).toBe(false)
  })

  it('3. catálogo + unknown: critérios vazios ou falha de identificação', () => {
    const emptyCat = [{ id: 'c1', name: 'Cat', softwares: [{ id: 's1', name: '' }] }]
    const res = buildDynamicUninstallList(emptyCat, { ok: true, status: 'success', items: mockInventory })

    expect(res.items[0].status).toBe(UNINSTALL_STATUS.UNKNOWN)
    expect(res.items[0].rawMatchStatus).toBe('unknown')
  })

  it('4. catálogo + ambiguous: múltiplos candidatos não viram instalado', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const amb = res.items.find(i => i.id === 'soft-ambiguous')

    expect(amb).toBeDefined()
    expect(amb.status).toBe(UNINSTALL_STATUS.AMBIGUOUS)
    expect(amb.rawMatchStatus).toBe('ambiguous')
    expect(amb.canDirectRemove).toBe(false)
  })

  it('5. item detectado sem estratégia explícita: não habilita ação destrutiva direta', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const chrome = res.items.find(i => i.id === 'soft-chrome')

    expect(chrome.status).toBe(UNINSTALL_STATUS.NO_STRATEGY)
    expect(chrome.canDirectRemove).toBe(false)
    expect(chrome.removalStrategy).toBe(REMOVAL_STRATEGY.NONE)
  })

  it('6. ausência de software nunca vira instalado (falso positivo impedido)', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: [] })
    expect(res.installedCount).toBe(0)
    expect(res.items.every(i => i.status !== UNINSTALL_STATUS.INSTALLED && i.status !== UNINSTALL_STATUS.NO_STRATEGY)).toBe(true)
  })

  it('7. unknown nunca vira instalado', () => {
    const res = buildDynamicUninstallList([{ id: 'c', name: 'C', softwares: [{ id: 'x', name: '' }] }], { ok: true, status: 'success', items: mockInventory })
    expect(res.items[0].status).not.toBe(UNINSTALL_STATUS.INSTALLED)
    expect(res.items[0].status).not.toBe(UNINSTALL_STATUS.NO_STRATEGY)
  })

  it('8. ambiguous nunca vira instalado', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const amb = res.items.find(i => i.id === 'soft-ambiguous')
    expect(amb.status).not.toBe(UNINSTALL_STATUS.INSTALLED)
    expect(amb.status).not.toBe(UNINSTALL_STATUS.NO_STRATEGY)
  })

  it('9. fallbacks nativos são preservados e incluem appwiz.cpl e ms-settings', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    expect(res.fallbacks).toBeDefined()
    expect(res.fallbacks.length).toBeGreaterThanOrEqual(1)
    expect(res.fallbacks.some(f => f.cmd.includes('appwiz.cpl'))).toBe(true)
    expect(res.fallbacks.some(f => f.cmd.includes('ms-settings:appsfeatures'))).toBe(true)
  })

  it('encaminha appwiz.cpl exclusivamente pelo canal de path', () => {
    const api = { runOpenPath: vi.fn(), runOpenExternal: vi.fn(), runOpen: vi.fn() }
    const fallback = NATIVE_FALLBACKS.find(item => item.id === 'appwiz')

    expect(openNativeFallback(fallback, api, 'path-id')).toBe(true)
    expect(api.runOpenPath).toHaveBeenCalledOnce()
    expect(api.runOpenPath).toHaveBeenCalledWith('path-id', '%SystemRoot%\\System32\\appwiz.cpl')
    expect(api.runOpenExternal).not.toHaveBeenCalled()
    expect(api.runOpen).not.toHaveBeenCalled()
  })

  it('encaminha ms-settings exclusivamente pelo canal externo de URI', () => {
    const api = { runOpenPath: vi.fn(), runOpenExternal: vi.fn(), runOpen: vi.fn() }
    const fallback = NATIVE_FALLBACKS.find(item => item.id === 'apps-settings')

    expect(openNativeFallback(fallback, api, 'uri-id')).toBe(true)
    expect(api.runOpenExternal).toHaveBeenCalledOnce()
    expect(api.runOpenExternal).toHaveBeenCalledWith('uri-id', 'ms-settings:appsfeatures')
    expect(api.runOpenPath).not.toHaveBeenCalled()
    expect(api.runOpen).not.toHaveBeenCalled()
  })

  it('rejeita tipo de fallback desconhecido sem executar qualquer canal', () => {
    const api = { runOpenPath: vi.fn(), runOpenExternal: vi.fn(), runOpen: vi.fn() }

    expect(openNativeFallback({ type: 'unknown', cmd: 'unsafe' }, api, 'invalid-id')).toBe(false)
    expect(api.runOpenPath).not.toHaveBeenCalled()
    expect(api.runOpenExternal).not.toHaveBeenCalled()
    expect(api.runOpen).not.toHaveBeenCalled()
  })

  it('10. IDs e metadados de categoria e software do catálogo são preservados', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const chrome = res.items.find(i => i.id === 'soft-chrome')

    expect(chrome.catId).toBe('cat-basic')
    expect(chrome.catName).toBe('Básicos')
    expect(chrome.name).toBe('Google Chrome')
  })

  it('11. falha de inventário (error) não é tratada como lista vazia confiável de desinstalados', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: false, status: 'error', items: [] })

    expect(res.isInventoryAvailable).toBe(false)
    expect(res.inventoryStatus).toBe('error')
    expect(res.items.every(i => i.status === UNINSTALL_STATUS.UNKNOWN)).toBe(true)
    expect(res.items.every(i => i.reason === 'INVENTORY_UNAVAILABLE')).toBe(true)
  })

  it('12. partial inventory mantém positivos e não transforma ausência em certeza', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'partial', items: mockInventory })

    expect(res.isInventoryAvailable).toBe(true)
    expect(res.inventoryStatus).toBe('partial')
    expect(res.items.find(i => i.id === 'soft-chrome').status).toBe(UNINSTALL_STATUS.NO_STRATEGY)
    expect(res.items.find(i => i.id === 'soft-7zip')).toMatchObject({ status: UNINSTALL_STATUS.UNKNOWN, reason: 'INVENTORY_PARTIAL' })
  })

  it('mantém itens desconhecidos enquanto o inventário ainda carrega', () => {
    const res = buildDynamicUninstallList(sampleCategories, null)

    expect(res.inventoryStatus).toBe('loading')
    expect(res.items.every(item => item.status === UNINSTALL_STATUS.UNKNOWN)).toBe(true)
  })

  it('13. nenhuma UninstallString de Registry é retornada como comando de execução', () => {
    const inventoryWithInternal = [
      {
        displayName: 'Google Chrome',
        comparison: { name: 'google chrome' },
        internal: { UninstallString: 'C:\\bad\\evil.exe /uninstall' },
      },
    ]
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: inventoryWithInternal })
    const chrome = res.items.find(i => i.id === 'soft-chrome')

    expect(chrome).not.toHaveProperty('cmd')
    expect(chrome).not.toHaveProperty('UninstallString')
    expect(chrome.canDirectRemove).toBe(false)
  })

  it('separa item catalogado com match confiável e item não catalogado sem duplicação', () => {
    const inventory = [
      mockInventory[0],
      {
        displayName: 'Software Externo',
        displayVersion: '3.2',
        publisher: 'Fornecedor Externo',
        comparison: { name: 'software externo', version: '3.2', publisher: 'fornecedor externo' },
        source: 'hkcu64',
      },
    ]
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: inventory })

    expect(res.otherInstalledItems).toHaveLength(1)
    expect(res.otherInstalledItems[0]).toMatchObject({
      name: 'Software Externo',
      version: '3.2',
      publisher: 'Fornecedor Externo',
      readOnly: true,
      canDirectRemove: false,
      removalStrategy: REMOVAL_STRATEGY.NONE,
    })
    expect(res.otherInstalledItems.some(item => item.name === 'Google Chrome')).toBe(false)
  })

  it('mantém dois itens não catalogados em Outros', () => {
    const inventory = [
      { displayName: 'Primeiro', comparison: { name: 'primeiro' } },
      { displayName: 'Segundo', comparison: { name: 'segundo' } },
    ]
    const res = buildDynamicUninstallList([], { ok: true, status: 'success', items: inventory })

    expect(res.otherInstalledItems.map(item => item.name)).toEqual(['Primeiro', 'Segundo'])
    expect(res.otherInstalledCount).toBe(2)
  })

  it('omite de Outros entradas sem displayName útil', () => {
    const inventory = [
      { displayName: '', comparison: { name: '' } },
      { displayName: '   ', comparison: { name: '' } },
      { comparison: { name: '' } },
      { displayName: 'Visível', comparison: { name: 'visível' } },
    ]
    const res = buildDynamicUninstallList([], { ok: true, status: 'success', items: inventory })

    expect(res.otherInstalledItems.map(item => item.name)).toEqual(['Visível'])
  })

  it('não consome candidatos ambiguous e preserva o estado do catálogo', () => {
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'success', items: mockInventory })
    const ambiguous = res.items.find(item => item.id === 'soft-ambiguous')

    expect(ambiguous.status).toBe(UNINSTALL_STATUS.AMBIGUOUS)
    expect(res.otherInstalledItems.filter(item => item.name === 'App Ambíguo')).toHaveLength(2)
  })

  it('não consome entrada do inventário quando o catálogo permanece unknown', () => {
    const categories = [{ id: 'c', name: 'C', softwares: [{ id: 'unknown', name: '' }] }]
    const inventory = [{ displayName: 'Observado', comparison: { name: 'observado' } }]
    const res = buildDynamicUninstallList(categories, { ok: true, status: 'success', items: inventory })

    expect(res.items[0].status).toBe(UNINSTALL_STATUS.UNKNOWN)
    expect(res.otherInstalledItems.map(item => item.name)).toEqual(['Observado'])
  })

  it('em inventário partial mostra observados e preserva ausência incerta no catálogo', () => {
    const inventory = [
      mockInventory[0],
      { displayName: 'Observado Parcial', comparison: { name: 'observado parcial' } },
    ]
    const res = buildDynamicUninstallList(sampleCategories, { ok: true, status: 'partial', items: inventory })

    expect(res.items.find(item => item.id === 'soft-7zip')).toMatchObject({ status: UNINSTALL_STATUS.UNKNOWN, reason: 'INVENTORY_PARTIAL' })
    expect(res.otherInstalledItems.map(item => item.name)).toEqual(['Observado Parcial'])
  })

  it('recalcula Outros quando uma nova entrada chega no refresh', () => {
    const initial = buildDynamicUninstallList([], { ok: true, status: 'success', items: [] })
    const refreshed = buildDynamicUninstallList([], {
      ok: true,
      status: 'success',
      items: [{ displayName: 'Novo Software', comparison: { name: 'novo software' } }],
    })

    expect(initial.otherInstalledItems).toEqual([])
    expect(refreshed.otherInstalledItems.map(item => item.name)).toEqual(['Novo Software'])
  })

  it('não expõe em Outros comandos, caminhos ou dados brutos do Registry', () => {
    const inventory = [{
      displayName: 'Software Informativo',
      displayVersion: '1.0',
      publisher: 'Fornecedor',
      installLocation: 'C:\\Program Files\\Software',
      registryKey: 'HKLM\\Software\\Unsafe',
      comparison: { name: 'software informativo' },
      internal: {
        UninstallString: 'C:\\unsafe.exe /remove',
        QuietUninstallString: 'C:\\unsafe.exe /quiet',
      },
    }]
    const res = buildDynamicUninstallList([], { ok: true, status: 'success', items: inventory })
    const other = res.otherInstalledItems[0]

    expect(other).toEqual({
      id: 'inventory-0',
      name: 'Software Informativo',
      version: '1.0',
      publisher: 'Fornecedor',
      architecture: null,
      scope: null,
      source: null,
      readOnly: true,
      canDirectRemove: false,
      removalStrategy: REMOVAL_STRATEGY.NONE,
    })
    expect(other).not.toHaveProperty('cmd')
    expect(other).not.toHaveProperty('installLocation')
    expect(other).not.toHaveProperty('registryKey')
    expect(other).not.toHaveProperty('internal')
    expect(other).not.toHaveProperty('UninstallString')
    expect(other).not.toHaveProperty('QuietUninstallString')
  })

  it('não apresenta Outros durante loading ou error', () => {
    const loading = buildDynamicUninstallList([], null)
    const error = buildDynamicUninstallList([], { ok: false, status: 'error', items: mockInventory })

    expect(loading.otherInstalledItems).toEqual([])
    expect(error.otherInstalledItems).toEqual([])
  })
})
