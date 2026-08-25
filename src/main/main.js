const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require('electron')
const { spawn, exec } = require('child_process')
const path = require('path')
const fs   = require('fs')
const { checkIsAdmin } = require('./adminCheck')
const { checkWmicFunctional } = require('./wmicCheck')
const { runScript, isSoftMapped, authenticatePath } = require('./scripts')
const { runCmd, runOpen, stopRun, runDeployItemTracked } = require('./processRunner')
const { loadConfig, saveConfig, validateConfig } = require('./configLoader')
const { getHostname, validateHostname } = require('./hostname')
const { validateExecutionRequest } = require('./commandRegistry')
const { createPreparationStateStore } = require('./machinePreparationState')
const { createMachinePreparationController } = require('./machinePreparation')

const isDev = !app.isPackaged

function getAppIcon() {
  const candidates = isDev
    ? [path.join(__dirname, '../../build/icon.ico')]
    : [
        path.join(process.resourcesPath, 'icon.ico'),
        path.join(__dirname, '../../build/icon.ico'),
      ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

let mainWindow
let machinePreparation

const WINDOW_X = 0
const WINDOW_Y = 0

function placeWindowTopLeft() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setPosition(WINDOW_X, WINDOW_Y)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720, height: 500,
    minWidth: 480, minHeight: 380,
    x: WINDOW_X, y: WINDOW_Y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Error] ${errorCode}: ${errorDescription} (${validatedURL})`)
  })

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (${sourceId}:${line})`)
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else if (isDev) {
    // Tenta dev server local, e se falhar carrega dist/renderer/index.html
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      const prodPath = path.join(__dirname, '../../dist/renderer/index.html')
      if (fs.existsSync(prodPath)) {
        mainWindow.loadFile(prodPath)
      }
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }

  mainWindow.setAlwaysOnTop(true, 'floating')
  placeWindowTopLeft()
  mainWindow.on('show', placeWindowTopLeft)
}

app.whenReady().then(() => {
  const stateStore = createPreparationStateStore(path.join(app.getPath('userData'), 'machine-preparation.json'))
  machinePreparation = createMachinePreparationController({ loadConfig, stateStore })
  createWindow()
  globalShortcut.register('CommandOrControl+Shift+F1', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) mainWindow.hide()
    else { mainWindow.show(); placeWindowTopLeft(); mainWindow.focus() }
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.on('run-cmd', (event, payload) => runCmd(event, payload))

ipcMain.handle('execute-command-by-id', (event, request) => {
  const result = validateExecutionRequest(request)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  const runId = Date.now().toString()
  runCmd(event, { id: runId, cmd: result.cmd, silent: false })
  return { ok: true, id: runId }
})

ipcMain.on('run-open', (event, payload) => runOpen(event, payload))
ipcMain.on('run-open-external', async (event, { id, target }) => {
  event.reply('cmd-line', { id, line: `$ abrindo: ${target}` })
  try {
    await shell.openExternal(target)
    event.reply('cmd-line', { id, line: '  ✓ aberto pelo Shell do Windows' })
    event.reply('cmd-done', { id, code: 0 })
  } catch (err) {
    event.reply('cmd-line', { id, line: `  [ERR] ${err.message}` })
    event.reply('cmd-done', { id, code: 1 })
  }
})
// Um UNC puro representa uma pasta. O cmd.exe tenta executa-lo como programa;
// o Shell e o equivalente correto ao Executar (Win+R) / Explorer.
ipcMain.on('run-open-path', async (event, { id, target }) => {
  event.reply('cmd-line', { id, line: `$ abrindo: ${target}` })
  try {
    const missingVars = []
    const expandedTarget = String(target).replace(/%([^%]+)%/g, (match, name) => {
      const value = process.env[name]
      if (value === undefined || value === '') missingVars.push(name)
      return value === undefined ? match : value
    })
    if (missingVars.length) {
      event.reply('cmd-line', { id, line: `  [ERR] Variavel de ambiente nao definida: ${missingVars.join(', ')}` })
      event.reply('cmd-done', { id, code: 1 })
      return
    }
    const error = await shell.openPath(expandedTarget)
    if (error) {
      event.reply('cmd-line', { id, line: `  [ERR] ${error}` })
      event.reply('cmd-done', { id, code: expandedTarget.startsWith('\\\\') ? 53 : 1 })
    } else {
      event.reply('cmd-line', { id, line: '  ✓ aberto no Explorer' })
      event.reply('cmd-done', { id, code: 0 })
    }
  } catch (err) {
    event.reply('cmd-line', { id, line: `  [ERR] ${err.message}` })
    event.reply('cmd-done', { id, code: 1 })
  }
})
ipcMain.on('stop-cmd', (event, { id }) => stopRun(id, event))

// Admin via net session (cmd) — sem PowerShell
ipcMain.handle('check-admin', () => checkIsAdmin())

// S: já mapeado?
ipcMain.handle('check-soft-mapped', () => isSoftMapped())

// Autenticacao de rede sob demanda — usada como fallback quando abrir algo
// falha por falta de acesso (nao ha checagem previa, ver App.jsx startOpen)
ipcMain.on('auth-network-path', (event, { id, user, password, uncRoot }) => {
  authenticatePath(event, id, user, password, uncRoot).then(code => {
    event.reply('network-auth-done', { id, code })
  })
})

// Scripts de rollout (cmd / dialog)
ipcMain.on('run-script', (event, payload) => {
  runScript(event, payload, () => mainWindow)
})

// Módulo Deploy: executa um item do catálogo de forma sequencial rastreada
ipcMain.handle('run-deploy-item', async (event, payload) => {
  const continuation = await machinePreparation.canContinue()
  if (!continuation.ok) return { ok: false, blocked: true, error: continuation.error || 'Reinício obrigatório antes do Deploy' }
  return runDeployItemTracked(event, payload?.id, payload?.item)
})

ipcMain.handle('get-app-version', () => app.getVersion())

// WMIC funcional (testa "path" — evita falso positivo do Win11)
ipcMain.handle('check-wmic', () => checkWmicFunctional())

// Instalar WMIC com progresso real do DISM
ipcMain.on('install-wmic', (event) => {
  const proc = spawn('dism', ['/online', '/add-capability', '/capabilityname:WMIC~~~~'], {
    windowsHide: false, shell: true
  })

  let lastPct = 0
  proc.stdout.on('data', d => {
    const m = d.toString().match(/(\d+\.?\d*)%/)
    if (m) {
      const pct = Math.round(parseFloat(m[1]))
      if (pct > lastPct) {
        lastPct = pct
        const status =
          pct < 10 ? 'Inicializando DISM...' :
          pct < 30 ? 'Baixando pacote WMIC...' :
          pct < 60 ? 'Instalando componentes...' :
          pct < 85 ? 'Configurando recursos...' : 'Finalizando...'
        event.reply('wmic-progress', { pct, status })
      }
    }
  })
  proc.on('close', code => event.reply('wmic-done', { success: code === 0 }))
  proc.on('error', err => event.reply('wmic-done', { success: false, error: err.message }))
})

// Controles da janela
ipcMain.on('window-minimize',   () => mainWindow?.minimize())
ipcMain.on('window-close',      () => app.quit())
ipcMain.handle('window-pin-state', () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isAlwaysOnTop()))
ipcMain.handle('window-set-pin', (_, pin) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  if (pin) mainWindow.setAlwaysOnTop(true, 'floating')
  else mainWindow.setAlwaysOnTop(false)
  return mainWindow.isAlwaysOnTop()
})

// Colapsar/restaurar: encolhe a janela real para o tamanho da barra de
// titulo quando "minimizado" na UI, para nao bloquear cliques atras dela.
const FULL_HEIGHT      = 500
const COLLAPSED_HEIGHT = 36
ipcMain.on('window-set-collapsed', (_, collapsed) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const [w] = mainWindow.getSize()
  mainWindow.setSize(w, collapsed ? COLLAPSED_HEIGHT : FULL_HEIGHT)
  placeWindowTopLeft()
})

// Log em arquivo
const logPath = 'C:\\Suporte\\TIDirectorMode.log'
ipcMain.on('write-log', (_, line) => {
  try {
    if (!fs.existsSync('C:\\Suporte')) fs.mkdirSync('C:\\Suporte', { recursive: true })
    const ts = new Date().toISOString().replace('T',' ').slice(0,19)
    fs.appendFileSync(logPath, `${ts} ${line}\n`)
  } catch {}
})
ipcMain.on('open-log', () => {
  if (fs.existsSync(logPath)) exec(`notepad.exe "${logPath}"`)
})

// Tela de Configuracoes: ler/gravar config.json e testar se um caminho existe
ipcMain.handle('get-config', () => loadConfig())
ipcMain.handle('validate-config', (_, newConfig) => validateConfig(newConfig))
ipcMain.handle('save-config', (_, newConfig) => saveConfig(newConfig))
ipcMain.handle('check-hostname', async () => {
  const config = loadConfig()
  const hostname = await getHostname()
  return validateHostname(hostname, config?.hostname?.pattern)
})
ipcMain.handle('machine-preparation-status', () => machinePreparation.status())
ipcMain.handle('machine-preparation-validate-hostname', (_, payload) => machinePreparation.validateCandidate(payload))
ipcMain.handle('machine-preparation-rename-hostname', (_, payload) => machinePreparation.rename(payload))
ipcMain.handle('machine-preparation-restart', (_, payload) => machinePreparation.restart(payload))
ipcMain.handle('test-path', async (_, target) => {
  if (!target || typeof target !== 'string' || !target.trim()) {
    return { exists: false, code: 'EMPTY', error: 'Caminho não informado' }
  }
  const cleanTarget = target.trim()
  try {
    await fs.promises.access(cleanTarget, fs.constants.R_OK)
    return { exists: true, ok: true }
  } catch (err) {
    const code = err.code || 'UNKNOWN'
    if (code === 'EACCES' || code === 'EPERM') {
      return {
        exists: false,
        code,
        authError: true,
        error: 'Credenciais inválidas ou sem permissão para acessar a pasta configurada. Abra o programa com credenciais que tenham acesso ao recurso.',
      }
    }
    if (code === 'ENOENT') {
      return {
        exists: false,
        code,
        error: 'Caminho ou arquivo não encontrado a partir desta máquina (confira se o servidor está acessível).',
      }
    }
    if (code === 'ETIMEDOUT') {
      return {
        exists: false,
        code,
        error: 'Tempo limite esgotado ao acessar o servidor na rede.',
      }
    }
    if (code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
      return {
        exists: false,
        code,
        error: 'Servidor indisponível ou inacessível na rede.',
      }
    }
    return {
      exists: false,
      code,
      error: `Falha ao acessar: ${err.message || code}`,
    }
  }
})
