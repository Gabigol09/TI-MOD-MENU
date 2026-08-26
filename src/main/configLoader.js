/**
 * configLoader.js
 * Carrega config.json da pasta do executavel (producao)
 * ou da raiz do projeto (desenvolvimento).
 * Sem PowerShell. Sem recompilacao necessaria para customizar.
 */

const fs   = require('fs')
const path = require('path')
const { validateConfig, toValidationResponse } = require('./configValidator')
const { normalizeConfigPaths } = require('./configuredPath')
const { createSharedConfigStore, resolveSharedSettingsPath } = require('./sharedConfigStore')

const DEFAULTS = {
  company: { name: 'TI Director Mode', environment: 'production' },
  network: {
    softServer:  '\\\\servidor\\soft',
    softDrive:   'S:',
    gateway:     '192.168.1.1',
    wifiProfile: 'CORP_WIFI',
  },
  paths: {
    office365:        '\\\\servidor\\soft\\Office365\\setup.exe',
    office2016:       '\\\\servidor\\soft\\Office2016\\setup.exe',
    office2016Config: '\\\\servidor\\soft\\Office2016\\config.xml',
    teams:            '\\\\servidor\\soft\\Teams\\MSTeamsSetup.exe',
    chrome:           '\\\\servidor\\soft\\Chrome\\ChromeSetup.exe',
    adobeReader:      '\\\\servidor\\soft\\Adobe\\AcroRead.msi',
    pdfCreator:       '\\\\servidor\\soft\\PDFCreator\\setup.exe',
    greenshot:        '\\\\servidor\\soft\\Greenshot\\Install.cmd',
    notepadPlusPlus:  '\\\\servidor\\soft\\NotepadPlusPlus\\installer.exe',
    firefox:          '\\\\servidor\\soft\\Firefox\\setup.msi',
    powerBI:          '\\\\servidor\\soft\\PowerBI\\PBIDesktopSetup_x64.exe',
  },
  hostname: {
    pattern:            '^[A-Za-z]{2}\\d{5}S$',
    patternDescription: '2 letras + 5 numeros + S (ex: AB12345S)',
    notebookPrefix:     'NB',
  },
  deploy: {
    categories: [
      {
        id: 'cat-basicos',
        name: 'Softwares Básicos',
        softwares: [
          {
            id: 'soft-chrome',
            name: 'Google Chrome',
            type: 'executable',
            path: '\\\\servidor\\soft\\Chrome\\ChromeSetup.exe',
            args: '/silent /install',
            description: 'Navegador padrão',
            defaultForPreparation: true
          },
          {
            id: 'soft-adobe',
            name: 'Adobe Acrobat Reader',
            type: 'executable',
            path: '\\\\servidor\\soft\\Adobe\\AcroRead.msi',
            args: '/qn',
            description: 'Leitor de PDF',
            defaultForPreparation: true
          },
          {
            id: 'soft-teams',
            name: 'Microsoft Teams',
            type: 'executable',
            path: '\\\\servidor\\soft\\Teams\\MSTeamsSetup.exe',
            args: '',
            description: 'Comunicação corporativa',
            defaultForPreparation: true
          }
        ]
      },
      {
        id: 'cat-opcionais',
        name: 'Opcionais',
        softwares: [
          {
            id: 'soft-greenshot',
            name: 'Greenshot',
            type: 'script',
            path: '\\\\servidor\\soft\\Greenshot\\Install.cmd',
            args: '',
            description: 'Captura de tela'
          },
          {
            id: 'soft-notepadpp',
            name: 'Notepad++',
            type: 'executable',
            path: '\\\\servidor\\soft\\NotepadPlusPlus\\installer.exe',
            args: '/S',
            description: 'Editor de texto avançado'
          },
          {
            id: 'soft-powerbi',
            name: 'Power BI Desktop',
            type: 'executable',
            path: '\\\\servidor\\soft\\PowerBI\\PBIDesktopSetup_x64.exe',
            args: '-quiet -norestart ACCEPT_EULA=1',
            description: 'Relatórios e dashboards'
          }
        ]
      }
    ]
  },
  log: {
    path: 'C:\\Suporte\\TIDirectorMode.log',
    dir:  'C:\\Suporte',
  },
}

function findConfigPath() {
  const candidates = [
    // Producao: ao lado do .exe
    path.join(process.execPath, '..', 'config.json'),
    // Producao: dentro do resources/
    path.join(process.resourcesPath || '', 'config.json'),
    // Desenvolvimento: raiz do projeto
    path.join(__dirname, '../../config.json'),
    path.join(__dirname, '../../../config.json'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// Mesma ordem de candidatos, mas retorna o primeiro caminho plausivel mesmo
// que o arquivo ainda nao exista — usado para CRIAR o config.json na primeira
// vez que alguem salva pela tela de Configuracoes (ex: instalacao nova, sem
// config.json ainda presente).
function findOrCreateConfigPath() {
  const existing = findConfigPath()
  if (existing) return existing
  const isDev = !process.resourcesPath || /node_modules[\\/]electron/i.test(process.execPath)
  return isDev
    ? path.join(__dirname, '../../config.json')
    : path.join(process.execPath, '..', 'config.json')
}

function deepMerge(base, override) {
  const result = { ...base }
  for (const key of Object.keys(override || {})) {
    if (
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object'
    ) {
      result[key] = deepMerge(base[key], override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}

let _config = null
let _baseConfig = null
let _sharedStore = null

function validateConfigResponse(newConfig) {
  const sourceValidation = toValidationResponse(validateConfig(newConfig))
  if (!sourceValidation.ok) return sourceValidation
  const merged = deepMerge(DEFAULTS, newConfig)
  return toValidationResponse(validateConfig(merged))
}

function loadBaseConfig() {
  if (_baseConfig) return _baseConfig
  const configPath = findConfigPath()
  if (!configPath) {
    console.warn('[config] config.json nao encontrado — usando defaults')
    _baseConfig = DEFAULTS
    return _baseConfig
  }
  try {
    const json = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    const normalization = normalizeConfigPaths(json)
    if (!normalization.ok) throw new Error(`${normalization.field}: ${normalization.error}`)
    const validation = validateConfigResponse(normalization.config)
    if (!validation.ok) throw new Error(validation.error)
    _baseConfig = deepMerge(DEFAULTS, normalization.config)
    console.log(`[config] base carregada de: ${configPath}`)
  } catch (err) {
    console.error(`[config] base invalida ou indisponivel em ${configPath}: ${err.message}`)
    _baseConfig = DEFAULTS
  }
  return _baseConfig
}

function configureSharedSettings({ isPackaged, execPath, projectRoot, portableDir, portableFile, filePath, fileSystem = fs }) {
  const resolvedPath = filePath || resolveSharedSettingsPath({ isPackaged, execPath, projectRoot, portableDir, portableFile })
  _sharedStore = createSharedConfigStore({
    filePath: resolvedPath,
    validate: validateConfigResponse,
    normalize: normalizeConfigPaths,
    fileSystem,
  })
  _config = null
  return _sharedStore.getStatus()
}

function ensureSharedStore() {
  if (_sharedStore) return _sharedStore
  return null
}

function loadConfig() {
  const base = loadBaseConfig()
  const store = ensureSharedStore()
  if (!store) {
    if (!_config) _config = base
    return _config
  }
  const shared = store.load()
  _config = shared.ok && shared.config ? deepMerge(base, shared.config) : base
  return _config
}

function reloadSharedConfig() {
  const base = loadBaseConfig()
  const store = ensureSharedStore()
  if (!store) return { ok: false, error: 'Configuração compartilhada não inicializada', config: base, status: { state: 'unavailable' } }
  const shared = store.load()
  _config = shared.ok && shared.config ? deepMerge(base, shared.config) : base
  return { ...shared, config: _config }
}

function getSharedConfigStatus() {
  return ensureSharedStore()?.getStatus() || { state: 'unavailable', source: 'app-directory', updatedAt: null, error: 'Configuração compartilhada não inicializada' }
}

function saveConfig(newConfig) {
  const normalization = normalizeConfigPaths(newConfig)
  if (!normalization.ok) return { ok: false, error: `${normalization.field}: ${normalization.error}` }
  const validation = validateConfigResponse(normalization.config)
  if (!validation.ok) return validation
  const store = ensureSharedStore()
  if (!store) return { ok: false, error: 'Configuração compartilhada não inicializada' }
  const saved = store.save(normalization.config)
  if (saved.ok) _config = deepMerge(loadBaseConfig(), saved.config)
  return saved.ok ? { ...saved, config: _config } : saved
}

module.exports = {
  configureSharedSettings,
  getSharedConfigStatus,
  loadConfig,
  reloadSharedConfig,
  saveConfig,
  deepMerge,
  validateConfig: validateConfigResponse,
  DEFAULTS,
}
