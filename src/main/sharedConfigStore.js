const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const FILE_NAME = 'ti-director-settings.json'
const SHAREABLE_KEYS = ['company', 'network', 'paths', 'hostname', 'deploy', 'log', 'preparationProfile']

function isWindowsPath(value) {
  return typeof value === 'string' && (/^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value))
}

function joinSettingsPath(directory) {
  return isWindowsPath(directory) ? path.win32.join(directory, FILE_NAME) : path.join(directory, FILE_NAME)
}

function resolveSharedSettingsPath({ isPackaged, execPath, projectRoot, portableDir, portableFile }) {
  if (!isPackaged) return joinSettingsPath(projectRoot)
  if (portableDir) return joinSettingsPath(portableDir)
  const executable = portableFile || execPath
  const directory = isWindowsPath(executable) ? path.win32.dirname(executable) : path.dirname(executable)
  return joinSettingsPath(directory)
}

function extractSharedSettings(config) {
  const shared = {}
  for (const key of SHAREABLE_KEYS) {
    if (config?.[key] !== undefined) shared[key] = config[key]
  }
  return JSON.parse(JSON.stringify(shared))
}

function signature(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function publicStatus(status) {
  return {
    state: status.state,
    source: 'app-directory',
    updatedAt: status.updatedAt || null,
    error: status.error || null,
  }
}

function validateEmptyPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && !Array.isArray(payload) && Object.keys(payload).length === 0)
}

function createSharedConfigStore({ filePath, validate, normalize, fileSystem = fs }) {
  let knownSignature = null
  let status = { state: 'missing', updatedAt: null, error: null }

  const readRaw = () => {
    if (!fileSystem.existsSync(filePath)) return { missing: true }
    const content = fileSystem.readFileSync(filePath, 'utf8')
    const stat = fileSystem.statSync(filePath)
    return { content, signature: signature(content), updatedAt: stat.mtime?.toISOString?.() || null }
  }

  const load = () => {
    try {
      const raw = readRaw()
      if (raw.missing) {
        knownSignature = null
        status = { state: 'missing', updatedAt: null, error: null }
        return { ok: true, config: null, status: publicStatus(status) }
      }
      let parsed
      try {
        parsed = JSON.parse(raw.content)
      } catch {
        status = { state: 'invalid', updatedAt: raw.updatedAt, error: 'JSON compartilhado inválido' }
        return { ok: false, config: null, status: publicStatus(status) }
      }
      const unexpectedKeys = Object.keys(parsed || {}).filter(key => !SHAREABLE_KEYS.includes(key))
      if (unexpectedKeys.length) {
        status = { state: 'invalid', updatedAt: raw.updatedAt, error: `Campo não compartilhável: ${unexpectedKeys[0]}` }
        return { ok: false, config: null, status: publicStatus(status) }
      }
      const normalized = normalize(parsed)
      if (!normalized.ok) {
        status = { state: 'invalid', updatedAt: raw.updatedAt, error: `${normalized.field}: ${normalized.error}` }
        return { ok: false, config: null, status: publicStatus(status) }
      }
      const shared = extractSharedSettings(normalized.config)
      const validation = validate(shared)
      if (!validation.ok) {
        status = { state: 'invalid', updatedAt: raw.updatedAt, error: validation.error }
        return { ok: false, config: null, status: publicStatus(status) }
      }
      if (validation.needsRepair) {
        status = { state: 'needsRepair', updatedAt: raw.updatedAt, error: 'Referências inexistentes' }
      } else {
        status = { state: 'ready', updatedAt: raw.updatedAt, error: null }
      }
      knownSignature = raw.signature
      return { ok: true, config: shared, status: publicStatus(status) }
    } catch (err) {
      const state = ['EACCES', 'EPERM', 'EROFS'].includes(err.code) ? 'unavailable' : 'unavailable'
      status = { state, updatedAt: null, error: err.message }
      return { ok: false, config: null, status: publicStatus(status) }
    }
  }

  const save = config => {
    const shared = extractSharedSettings(config)
    const normalized = normalize(shared)
    if (!normalized.ok) return { ok: false, state: 'invalid', error: `${normalized.field}: ${normalized.error}`, status: publicStatus(status) }
    const validation = validate(normalized.config)
    if (!validation.ok) return { ok: false, state: 'invalid', error: validation.error, status: publicStatus(status) }
    if (validation.needsRepair) return { ok: false, state: 'needsRepair', error: 'Referências inexistentes não podem ser salvas.', status: publicStatus(status) }

    try {
      const current = readRaw()
      const currentSignature = current.missing ? null : current.signature
      if (currentSignature !== knownSignature) {
        status = { state: 'conflict', updatedAt: current.updatedAt || null, error: 'A configuração compartilhada foi alterada por outra instância. Recarregue antes de salvar.' }
        return { ok: false, state: 'conflict', error: status.error, status: publicStatus(status) }
      }

      const content = `${JSON.stringify(normalized.config, null, 2)}\n`
      const temporaryPath = `${filePath}.tmp`
      try {
        fileSystem.writeFileSync(temporaryPath, content, 'utf8')
        fileSystem.renameSync(temporaryPath, filePath)
      } catch (err) {
        try { if (fileSystem.existsSync(temporaryPath)) fileSystem.unlinkSync(temporaryPath) } catch {}
        if (['EACCES', 'EPERM', 'EROFS'].includes(err.code)) {
          status = { state: 'readOnly', updatedAt: current.updatedAt || null, error: 'Configuração compartilhada em modo somente leitura.' }
          return { ok: false, state: 'readOnly', error: status.error, status: publicStatus(status) }
        }
        status = { state: 'unavailable', updatedAt: current.updatedAt || null, error: err.message }
        return { ok: false, state: 'unavailable', error: err.message, status: publicStatus(status) }
      }

      const saved = readRaw()
      knownSignature = saved.signature
      status = { state: 'ready', updatedAt: saved.updatedAt, error: null }
      return { ok: true, config: normalized.config, status: publicStatus(status) }
    } catch (err) {
      const state = ['EACCES', 'EPERM', 'EROFS'].includes(err.code) ? 'readOnly' : 'unavailable'
      status = { state, updatedAt: null, error: state === 'readOnly' ? 'Configuração compartilhada em modo somente leitura.' : err.message }
      return { ok: false, state, error: status.error, status: publicStatus(status) }
    }
  }

  return {
    load,
    save,
    getStatus: () => publicStatus(status),
    getFilePath: () => filePath,
  }
}

module.exports = {
  createSharedConfigStore,
  extractSharedSettings,
  resolveSharedSettingsPath,
  validateEmptyPayload,
  SHAREABLE_KEYS,
  FILE_NAME,
}
