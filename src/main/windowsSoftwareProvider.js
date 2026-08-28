const iconv = require('iconv-lite')
const { execFile } = require('child_process')

const UNINSTALL_PATH = 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'

const WINDOWS_SOFTWARE_SOURCES = [
  { id: 'hklm64', hive: 'HKLM', scope: 'machine', architecture: '64-bit', view: '64' },
  { id: 'hklm32', hive: 'HKLM', scope: 'machine', architecture: '32-bit', view: '32' },
  { id: 'hkcu64', hive: 'HKCU', scope: 'user', architecture: '64-bit', view: '64' },
  { id: 'hkcu32', hive: 'HKCU', scope: 'user', architecture: '32-bit', view: '32' },
]

const EXPOSED_VALUE_NAMES = new Set(['DisplayName', 'DisplayVersion', 'Publisher', 'InstallLocation'])
const INTERNAL_VALUE_NAMES = new Set(['UninstallString', 'QuietUninstallString'])

function parseRegistryQueryOutput(output, source) {
  const entries = []
  let current = null
  for (const line of String(output || '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^HKEY_/i.test(trimmed)) {
      if (current) entries.push(current)
      current = { registryKey: trimmed, source: source.id, scope: source.scope, architecture: source.architecture, values: {}, internal: {} }
      continue
    }
    if (!current) continue
    const match = trimmed.match(/^(\S+)\s+REG_\S+\s*(.*)$/i)
    if (!match) continue
    const [, name, value] = match
    if (EXPOSED_VALUE_NAMES.has(name)) current.values[name] = value
    if (INTERNAL_VALUE_NAMES.has(name)) current.internal[name] = value
  }
  if (current) entries.push(current)
  return entries
}

function executeRegistryQuery(source, execFileImpl = execFile) {
  const key = `${source.hive}\\${UNINSTALL_PATH}`
  return new Promise((resolve, reject) => {
    execFileImpl('reg.exe', ['query', key, '/s', `/reg:${source.view}`], { windowsHide: true, encoding: 'buffer', timeout: 15000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const detail = iconv.decode(Buffer.isBuffer(stderr) ? stderr : Buffer.from(stderr || ''), 'cp850').trim()
        reject(new Error(detail || error.message || `Falha ao consultar ${source.id}`))
        return
      }
      const decoded = iconv.decode(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || ''), 'cp850')
      resolve(parseRegistryQueryOutput(decoded, source))
    })
  })
}

async function readWindowsSoftwareSources(options = {}) {
  const sources = options.sources || WINDOWS_SOFTWARE_SOURCES
  const query = options.query || (source => executeRegistryQuery(source, options.execFile))
  const entries = []
  const warnings = []
  let succeededSources = 0

  for (const source of sources) {
    try {
      const sourceEntries = await query(source)
      entries.push(...sourceEntries)
      succeededSources += 1
    } catch (error) {
      warnings.push({ source: source.id, code: 'SOURCE_UNAVAILABLE', message: error.message || 'Fonte indisponível' })
    }
  }

  return { entries, warnings, succeededSources, totalSources: sources.length }
}

module.exports = {
  WINDOWS_SOFTWARE_SOURCES,
  parseRegistryQueryOutput,
  executeRegistryQuery,
  readWindowsSoftwareSources,
}
