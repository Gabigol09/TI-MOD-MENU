const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ti', {
  // Executa CMD e recebe output em tempo real
  runCmd: (id, cmd, silent = false) => {
    ipcRenderer.send('run-cmd', { id, cmd, silent })
  },
  runOpen: (id, cmd) => {
    ipcRenderer.send('run-open', { id, cmd })
  },
  runOpenExternal: (id, target) => {
    ipcRenderer.send('run-open-external', { id, target })
  },
  runOpenPath: (id, target) => {
    ipcRenderer.send('run-open-path', { id, target })
  },
  stopCmd: (id) => ipcRenderer.send('stop-cmd', { id }),
  onCmdLine: (cb) => ipcRenderer.on('cmd-line', (_, data) => cb(data)),
  onCmdDone: (cb) => ipcRenderer.on('cmd-done', (_, data) => cb(data)),
  removeCmdListeners: () => {
    ipcRenderer.removeAllListeners('cmd-line')
    ipcRenderer.removeAllListeners('cmd-done')
    ipcRenderer.removeAllListeners('network-auth-done')
  },

  checkAdmin: () => ipcRenderer.invoke('check-admin'),
  checkSoftMapped: () => ipcRenderer.invoke('check-soft-mapped'),
  authNetworkPath: (id, user, password, uncRoot) => {
    ipcRenderer.send('auth-network-path', { id, user, password, uncRoot })
  },
  onNetworkAuthDone: (cb) => ipcRenderer.on('network-auth-done', (_, data) => cb(data)),
  runScript: (scriptId, id, credentials) => {
    ipcRenderer.send('run-script', { scriptId, id, ...credentials })
  },
  runDeployItem: (id, item) => {
    return ipcRenderer.invoke('run-deploy-item', { id, item })
  },

  // WMIC
  checkWmic: () => ipcRenderer.invoke('check-wmic'),
  installWmic: () => ipcRenderer.send('install-wmic'),
  onWmicProgress: (cb) => ipcRenderer.on('wmic-progress', (_, data) => cb(data)),
  onWmicDone: (cb) => ipcRenderer.on('wmic-done', (_, data) => cb(data)),

  // Janela
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  togglePin: (pin) => ipcRenderer.send('window-toggle-pin', pin),
  setCollapsed: (collapsed) => ipcRenderer.send('window-set-collapsed', collapsed),

  // Log
  writeLog: (line) => ipcRenderer.send('write-log', line),
  openLog: () => ipcRenderer.send('open-log'),

  // Configuracoes (tela de settings)
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  testPath: (target) => ipcRenderer.invoke('test-path', target),
})
