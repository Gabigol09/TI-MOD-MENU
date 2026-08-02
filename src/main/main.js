const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const { spawn, exec } = require('child_process')
const path = require('path')
const fs   = require('fs')
const { checkIsAdmin } = require('./adminCheck')
const { checkWmicFunctional } = require('./wmicCheck')
const { runScript, isSoftMapped } = require('./scripts')
const { runCmd, runOpen, stopRun } = require('./processRunner')
const { loadConfig, saveConfig } = require('./configLoader')

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }

  mainWindow.setAlwaysOnTop(true, 'floating')
  placeWindowTopLeft()
  mainWindow.on('show', placeWindowTopLeft)
}

app.whenReady().then(() => {
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
ipcMain.on('run-open', (event, payload) => runOpen(event, payload))
ipcMain.on('stop-cmd', (event, { id }) => stopRun(id, event))

// Admin via net session (cmd) — sem PowerShell
ipcMain.handle('check-admin', () => checkIsAdmin())

// S: já mapeado?
ipcMain.handle('check-soft-mapped', () => isSoftMapped())

// Scripts de rollout (cmd / dialog)
ipcMain.on('run-script', (event, payload) => {
  runScript(event, payload, () => mainWindow)
})

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
ipcMain.on('window-toggle-pin', (_, pin) => mainWindow?.setAlwaysOnTop(pin, 'floating'))

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
ipcMain.handle('save-config', (_, newConfig) => saveConfig(newConfig))
ipcMain.handle('test-path', (_, target) => {
  try {
    return { exists: !!target && fs.existsSync(target) }
  } catch {
    return { exists: false }
  }
})
