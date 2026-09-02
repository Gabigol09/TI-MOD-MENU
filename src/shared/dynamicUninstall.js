import { matchCatalogItem } from './softwareInventoryMatcher.js'

export const REMOVAL_STRATEGY = {
  NONE: 'none',
}

export const UNINSTALL_STATUS = {
  INSTALLED: 'installed',
  NOT_INSTALLED: 'notInstalled',
  AMBIGUOUS: 'ambiguous',
  UNKNOWN: 'unknown',
  NO_STRATEGY: 'no_strategy',
}

export const NATIVE_FALLBACKS = [
  {
    id: 'appwiz',
    name: 'Programas e Recursos',
    description: 'Painel clássico do Windows para desinstalação de programas',
    type: 'path',
    cmd: '%SystemRoot%\\System32\\appwiz.cpl',
  },
  {
    id: 'apps-settings',
    name: 'Aplicativos instalados',
    description: 'Configurações do Windows para administrar aplicativos instalados',
    type: 'uri',
    cmd: 'ms-settings:appsfeatures',
  },
]

export function openNativeFallback(fallback, api, id) {
  if (fallback?.type === 'path' && typeof api?.runOpenPath === 'function') {
    api.runOpenPath(id, fallback.cmd)
    return true
  }
  if (fallback?.type === 'uri' && typeof api?.runOpenExternal === 'function') {
    api.runOpenExternal(id, fallback.cmd)
    return true
  }
  return false
}

function unavailableItem(catalogItem, reason) {
  return {
    id: catalogItem.id,
    name: catalogItem.name,
    catId: catalogItem.catId,
    catName: catalogItem.catName,
    status: UNINSTALL_STATUS.UNKNOWN,
    rawMatchStatus: UNINSTALL_STATUS.UNKNOWN,
    reason,
    canDirectRemove: false,
    removalStrategy: REMOVAL_STRATEGY.NONE,
    matches: [],
    version: null,
    publisher: null,
  }
}

export function buildDynamicUninstallList(deployCategories = [], inventoryResult = null) {
  const inventoryItems = Array.isArray(inventoryResult?.items) ? inventoryResult.items : []
  const inventoryStatus = inventoryResult?.status || 'loading'
  const isInventoryAvailable = inventoryResult?.ok === true && inventoryStatus !== 'error'
  const catalogItems = (deployCategories || []).flatMap(category =>
    (category?.softwares || []).map(software => ({
      ...software,
      catId: category.id,
      catName: category.name,
    })),
  )

  const items = catalogItems.map(catalogItem => {
    if (!isInventoryAvailable) return unavailableItem(catalogItem, inventoryStatus === 'loading' ? 'INVENTORY_LOADING' : 'INVENTORY_UNAVAILABLE')

    const match = matchCatalogItem(catalogItem, inventoryItems)
    if (inventoryStatus === 'partial' && match.status === UNINSTALL_STATUS.NOT_INSTALLED) {
      return unavailableItem(catalogItem, 'INVENTORY_PARTIAL')
    }

    const matchedEntry = match.matches?.[0] || null
    const status = match.status === UNINSTALL_STATUS.INSTALLED ? UNINSTALL_STATUS.NO_STRATEGY : match.status
    return {
      id: catalogItem.id,
      name: catalogItem.name,
      catId: catalogItem.catId,
      catName: catalogItem.catName,
      status,
      rawMatchStatus: match.status,
      reason: match.reason,
      canDirectRemove: false,
      removalStrategy: REMOVAL_STRATEGY.NONE,
      matches: match.matches || [],
      version: matchedEntry?.displayVersion || null,
      publisher: matchedEntry?.publisher || null,
    }
  })

  return {
    items,
    fallbacks: NATIVE_FALLBACKS,
    inventoryStatus,
    isInventoryAvailable,
    installedCount: items.filter(item => item.status === UNINSTALL_STATUS.NO_STRATEGY || item.status === UNINSTALL_STATUS.INSTALLED).length,
    notInstalledCount: items.filter(item => item.status === UNINSTALL_STATUS.NOT_INSTALLED).length,
    unknownCount: items.filter(item => item.status === UNINSTALL_STATUS.UNKNOWN || item.status === UNINSTALL_STATUS.AMBIGUOUS).length,
  }
}
