/**
 * corporatePaths.js
 * Agora lido dinamicamente do config.json — nao requer recompilacao.
 * Mantem a mesma interface de antes para nao quebrar scripts.js e main.js.
 */

const { loadConfig } = require('./configLoader')

function resolvePaths(cfg) {
  const p   = cfg.paths
  const net = cfg.network

  return {
    SOFT_UNC:         net.softServer,
    SOFT_DRIVE:       net.softDrive,
    GATEWAY:          net.gateway,
    WIFI_PROFILE:     net.wifiProfile,

    OFFICE_365:         p.office365,
    OFFICE_2016:          p.office2016,
    OFFICE_2016_CONFIG:   p.office2016Config,

    OFFICE_365_START:
      `start "" "${p.office365}"`,

    OFFICE_2016_START:
      `start "" "${p.office2016}" /config "${p.office2016Config}"`,

    TEAMS:            p.teams,
    CHROME:           p.chrome,
    ADOBE_READER:     `msiexec /i "${p.adobeReader}" /q`,
    PDF_CREATOR:      `"${p.pdfCreator}" /silent`,
    GREENSHOT:        p.greenshot,
    NOTEPADPP:        `"${p.notepadPlusPlus}" /S`,
    FIREFOX:          `msiexec /i "${p.firefox}" /qn`,
    POWER_BI:         `"${p.powerBI}" -quiet -norestart ACCEPT_EULA=1`,

    LOG_PATH:         cfg.log.path,
    LOG_DIR:          cfg.log.dir,

    HOSTNAME_PATTERN:      cfg.hostname.pattern,
    HOSTNAME_DESCRIPTION:  cfg.hostname.patternDescription,
    NOTEBOOK_PREFIX:       cfg.hostname.notebookPrefix,
  }
}

function getPaths() {
  return resolvePaths(loadConfig())
}

// Exporta a FUNCAO, nao o resultado — assim cada chamada le o config.json
// atual, e mudancas salvas na tela de Configuracoes valem no proximo comando,
// sem precisar reiniciar o app.
module.exports = { getPaths, resolvePaths }
