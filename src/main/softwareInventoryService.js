const { readWindowsSoftwareSources } = require('./windowsSoftwareProvider')
const { normalizeAndDeduplicate, matchCatalogItem } = require('./softwareInventory')

const DEFAULT_CACHE_TTL_MS = 15000

function validateInventoryPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const keys = Object.keys(payload)
  return keys.every(key => key === 'refresh') && (payload.refresh === undefined || typeof payload.refresh === 'boolean')
}

function createSoftwareInventoryService(options = {}) {
  const provider = options.provider || readWindowsSoftwareSources
  const now = options.now || Date.now
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  let cache = null

  async function getInventory(payload = {}) {
    if (!validateInventoryPayload(payload)) return { ok: false, status: 'error', items: [], warnings: [], error: 'Payload inválido' }
    if (!payload.refresh && cache && now() - cache.createdAt < cacheTtlMs) return { ...cache.response, cached: true }

    try {
      const raw = await provider()
      const items = normalizeAndDeduplicate(raw.entries)
      const allFailed = raw.succeededSources === 0
      const status = allFailed ? 'error' : raw.warnings.length ? 'partial' : 'success'
      const response = {
        ok: !allFailed,
        status,
        items,
        warnings: raw.warnings,
        sources: { succeeded: raw.succeededSources, total: raw.totalSources },
        cached: false,
      }
      if (allFailed) response.error = 'Não foi possível consultar as fontes locais de software instalado.'
      if (!allFailed) cache = { createdAt: now(), response }
      return response
    } catch (error) {
      return { ok: false, status: 'error', items: [], warnings: [], error: error.message || 'Falha ao consultar inventário local', cached: false }
    }
  }

  function match(catalogItem, inventory) {
    return matchCatalogItem(catalogItem, inventory)
  }

  return { getInventory, match }
}

function registerSoftwareInventoryIpc(ipcMain, service) {
  ipcMain.handle('installed-software-get-inventory', (_, payload) => service.getInventory(payload))
}

module.exports = {
  DEFAULT_CACHE_TTL_MS,
  validateInventoryPayload,
  createSoftwareInventoryService,
  registerSoftwareInventoryIpc,
}
