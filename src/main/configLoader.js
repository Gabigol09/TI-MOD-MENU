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

function loadConfig() {
  if (_config) return _config

  const configPath = findConfigPath()
  if (!configPath) {
    console.warn('[config] config.json nao encontrado — usando defaults')
    _config = DEFAULTS
    return _config
  }

  try {
    const raw  = fs.readFileSync(configPath, 'utf8')
    const json = JSON.parse(raw)
    const normalization = normalizeConfigPaths(json)
    if (!normalization.ok) throw new Error(`${normalization.field}: ${normalization.error}`)
    const normalizedConfig = normalization.config
    const sourceValidation = toValidationResponse(validateConfig(normalizedConfig))
    const merged = deepMerge(DEFAULTS, normalizedConfig)
    const validation = sourceValidation.ok
      ? toValidationResponse(validateConfig(merged))
      : sourceValidation
    if (!validation.ok) {
      console.error(`[config] configuracao estruturalmente invalida em ${configPath}: ${validation.error}`)
      _config = DEFAULTS
      return _config
    }
    _config = merged
    console.log(`[config] carregado de: ${configPath}`)
  } catch (err) {
    console.error(`[config] JSON invalido ou erro de leitura em ${configPath}: ${err.message}`)
    _config = DEFAULTS
  }

  return _config
}

/**
 * Salva o config.json a partir do objeto vindo da tela de Configuracoes,
 * valida a estrutura antes de gravar e atualiza o cache em memoria — assim o
 * proximo comando ja usa os valores novos, sem precisar reiniciar o app.
 */
function validateConfigResponse(newConfig) {
  const sourceValidation = toValidationResponse(validateConfig(newConfig))
  if (!sourceValidation.ok) return sourceValidation
  const merged = deepMerge(DEFAULTS, newConfig)
  return toValidationResponse(validateConfig(merged))
}

function saveConfig(newConfig) {
  const normalization = normalizeConfigPaths(newConfig)
  if (!normalization.ok) return { ok: false, error: `${normalization.field}: ${normalization.error}` }
  const normalizedConfig = normalization.config
  const validation = validateConfigResponse(normalizedConfig)
  if (!validation.ok) return validation

  const configPath = findOrCreateConfigPath()
  try {
    fs.writeFileSync(configPath, JSON.stringify(normalizedConfig, null, 2), 'utf8')
    _config = deepMerge(DEFAULTS, normalizedConfig)
    console.log(`[config] salvo em: ${configPath}`)
    return { ok: true, path: configPath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

module.exports = { loadConfig, saveConfig, deepMerge, validateConfig: validateConfigResponse, DEFAULTS }
