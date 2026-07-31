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
    rolloutAssistant: '\\\\servidor\\soft\\RolloutAssistant\\RolloutAssistant.exe',
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

module.exports = { loadConfig }
