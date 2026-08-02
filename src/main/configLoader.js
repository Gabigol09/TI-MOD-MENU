/**
 * configLoader.js
 * Carrega config.json da pasta do executavel (producao)
 * ou da raiz do projeto (desenvolvimento).
 * Sem PowerShell. Sem recompilacao necessaria para customizar.
 */

const fs   = require('fs')
const path = require('path')

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
    _config = deepMerge(DEFAULTS, json)
    console.log(`[config] carregado de: ${configPath}`)
  } catch (err) {
    console.error(`[config] erro ao ler ${configPath}: ${err.message}`)
    _config = DEFAULTS
  }

  return _config
}

/**
 * Salva o config.json a partir do objeto vindo da tela de Configuracoes,
 * valida o regex do hostname antes de gravar (nunca grava um regex quebrado),
 * e atualiza o cache em memoria — assim o proximo comando ja usa os valores
 * novos, sem precisar reiniciar o app.
 */
function saveConfig(newConfig) {
  const pattern = newConfig?.hostname?.pattern
  if (pattern) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(pattern)
    } catch (err) {
      return { ok: false, error: `Regex de hostname invalido: ${err.message}` }
    }
  }

  const configPath = findOrCreateConfigPath()
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8')
    _config = deepMerge(DEFAULTS, newConfig)
    console.log(`[config] salvo em: ${configPath}`)
    return { ok: true, path: configPath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

module.exports = { loadConfig, saveConfig }
