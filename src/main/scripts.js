// Scripts de rollout — somente cmd.exe / exec / dialog (sem PowerShell)

const { spawn, exec } = require('child_process')
const fs = require('fs')
const { dialog, shell } = require('electron')
const { getPaths } = require('./corporatePaths')
const { getHostname, isNotebookHostname } = require('./hostname')
const {
  runCmdTracked,
  track,
  untrack,
  emitLine,
  wasCancelled,
  streamLines,
} = require('./processRunner')

const HYBRID_AUTH_TIMEOUT_MS = 90000
const HYBRID_POLL_INTERVAL_MS = 2000
const EXPLORER_SETTLE_MS = 3000

/** Codigo 2 = hibrido esgotado; renderer deve pedir credenciais e reexecutar. */
const NEED_CREDENTIALS_CODE = 2

function emitDone(event, id, code) {
  event.reply('cmd-done', { id, code })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeDrive(drive) {
  const d = String(drive).trim().replace(/:$/, '')
  return d ? `${d}:` : 'S:'
}

function extractServerFromUnc(unc) {
  const m = String(unc).match(/^\\\\([^\\]+)/)
  return m ? m[1] : null
}

function isSoftMapped() {
  const drive = normalizeDrive(getPaths().SOFT_DRIVE)
  return new Promise(resolve => {
    exec(`net use ${drive}`, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(false)
      const s = stdout.toLowerCase()
      const driveLower = drive.toLowerCase()
      resolve(
        s.includes('ok') ||
        s.includes('feita corretamente') ||
        s.includes('connected') ||
        (s.includes(driveLower) && !s.includes('nao foi encontrad') && !s.includes('not found'))
      )
    })
  })
}

/** Confere leitura real no UNC (fs) — mais confiavel que dir/net use isolados. */
function canAccessUnc(uncRoot) {
  return new Promise(resolve => {
    fs.access(uncRoot, fs.constants.R_OK, err => resolve(!err))
  })
}

function pipeNetProcess(event, id, proc, resolve) {
  track(id, proc)
  streamLines(event, id, proc)
  proc.on('close', code => {
    untrack(id, proc)
    if (wasCancelled(id)) return resolve(-1)
    resolve(code ?? 1)
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (wasCancelled(id)) return resolve(-1)
    emitLine(event, id, `  [ERR] ${err.message}`)
    resolve(1)
  })
}

/** Executa net.exe com argumentos separados — evita parsing do cmd.exe com @, %, etc. */
function runNetUseArgs(event, id, args) {
  return new Promise(resolve => {
    const proc = spawn('net.exe', ['use', ...args], {
      shell: false,
      windowsHide: true,
    })
    pipeNetProcess(event, id, proc, resolve)
  })
}

function runCmdkeyAdd(event, id, server, user, password) {
  return new Promise(resolve => {
    const proc = spawn('cmdkey.exe', [
      '/add', server,
      `/user:${String(user).trim()}`,
      `/pass:${String(password)}`,
    ], { shell: false, windowsHide: true })
    pipeNetProcess(event, id, proc, resolve)
  })
}

async function clearSoftDriveMapping(event, id) {
  const drive = normalizeDrive(getPaths().SOFT_DRIVE)
  await runNetUseArgs(event, id, [drive, '/delete', '/y'])
}

function mapSoftDriveSilent(event, id) {
  const { SOFT_DRIVE, SOFT_UNC } = getPaths()
  return runNetUseArgs(event, id, [
    normalizeDrive(SOFT_DRIVE),
    SOFT_UNC,
    '/persistent:yes',
  ])
}

/** Vincula sessao ao UNC sem letra — util apos autenticar pelo Explorer. */
function bindUncSession(event, id, uncRoot) {
  return runNetUseArgs(event, id, [uncRoot, '/persistent:no'])
}

async function mapSoftDriveWithCreds(event, id, user, password) {
  const { SOFT_DRIVE, SOFT_UNC } = getPaths()
  const drive = normalizeDrive(SOFT_DRIVE)
  const trimmedUser = String(user).trim()

  emitLine(event, id, `> mapeando ${drive} -> ${SOFT_UNC}`)
  emitLine(event, id, '$ [credenciais ocultadas]')

  // net.exe direto: user/senha UPN (@) nao passam pelo parser do cmd.exe
  let code = await runNetUseArgs(event, id, [
    drive,
    SOFT_UNC,
    String(password),
    `/user:${trimmedUser}`,
    '/persistent:yes',
  ])
  if (code === -1) return -1
  if (code === 0 || await isSoftMapped()) return 0

  const server = extractServerFromUnc(SOFT_UNC)
  if (!server) return code

  emitLine(event, id, '> tentando via cmdkey + net use...')
  code = await runCmdkeyAdd(event, id, server, trimmedUser, password)
  if (code === -1) return -1
  if (code !== 0) return code

  code = await runNetUseArgs(event, id, [drive, SOFT_UNC, '/persistent:yes'])
  return code
}

async function waitForUncAccess(event, id, uncRoot, timeoutMs) {
  await sleep(EXPLORER_SETTLE_MS)
  const deadline = Date.now() + timeoutMs
  let polls = 0

  while (Date.now() < deadline) {
    if (wasCancelled(id)) return false
    polls += 1
    if (polls === 1 || polls % 4 === 0) {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      emitLine(event, id, `  ... verificando acesso (${left}s restantes)`)
    }
    if (await canAccessUnc(uncRoot)) return true
    await sleep(HYBRID_POLL_INTERVAL_MS)
  }
  return false
}

/**
 * Fluxo hibrido de mapeamento:
 * 1) net use silencioso (sessao atual)
 * 2) Explorer via Shell — Windows pede credenciais nativamente
 * 3) net use silencioso de novo
 * 4) net use com credenciais do modal (fallback cmdkey)
 *
 * Retorna 0 se S: mapeado OU se o UNC estiver acessivel (Office usa caminho UNC).
 */
async function ensureSoftMapped(event, id, user, password) {
  const { SOFT_DRIVE, SOFT_UNC } = getPaths()
  const drive = normalizeDrive(SOFT_DRIVE)

  if (await isSoftMapped()) {
    emitLine(event, id, `> ${drive} ja mapeado ✓`)
    return 0
  }

  await clearSoftDriveMapping(event, id)

  emitLine(event, id, `> [1/4] mapear ${drive} com sessao atual...`)
  let code = await mapSoftDriveSilent(event, id)
  if (code === -1) return -1
  if (code === 0 || await isSoftMapped()) {
    emitLine(event, id, `> OK ${drive} mapeado ✓`)
    return 0
  }

  emitLine(event, id, '> [2/4] abrindo compartilhamento no Explorer')
  emitLine(event, id, '>       (o Windows pode pedir usuario/senha de rede)')
  try {
    const openErr = await shell.openPath(SOFT_UNC)
    if (openErr) emitLine(event, id, `  aviso: ${openErr}`)
    else emitLine(event, id, '  Explorer aberto — autentique na janela do Windows')
  } catch (err) {
    emitLine(event, id, `  [ERR] ${err.message}`)
  }

  emitLine(event, id, `> [3/4] aguardando autenticacao (ate ${HYBRID_AUTH_TIMEOUT_MS / 1000}s)...`)
  const authenticated = await waitForUncAccess(event, id, SOFT_UNC, HYBRID_AUTH_TIMEOUT_MS)
  if (wasCancelled(id)) return -1

  if (authenticated) {
    emitLine(event, id, '> compartilhamento acessivel — vinculando sessao...')
    await bindUncSession(event, id, SOFT_UNC)
    if (wasCancelled(id)) return -1

    emitLine(event, id, '> mapeando unidade...')
    code = await mapSoftDriveSilent(event, id)
    if (code === -1) return -1
    if (code === 0 || await isSoftMapped()) {
      emitLine(event, id, `> OK ${drive} mapeado ✓`)
      return 0
    }
    emitLine(event, id, `> AVISO: ${drive} nao mapeado, mas ${SOFT_UNC} acessivel — continuando`)
    return 0
  }

  emitLine(event, id, '> timeout — compartilhamento ainda inacessivel')

  if (user && password) {
    emitLine(event, id, '> [4/4] mapear com credenciais informadas...')
    code = await mapSoftDriveWithCreds(event, id, user, password)
    if (code === -1) return -1
    if (code === 0 || await isSoftMapped()) {
      emitLine(event, id, `> OK ${drive} mapeado ✓`)
      return 0
    }
    if (await canAccessUnc(SOFT_UNC)) {
      emitLine(event, id, `> AVISO: ${drive} nao mapeado, mas ${SOFT_UNC} acessivel — continuando`)
      return 0
    }
    emitLine(event, id, '> AVISO falha no mapeamento — verifique usuario/senha e rede')
    return code ?? 1
  }

  if (await canAccessUnc(SOFT_UNC)) {
    emitLine(event, id, `> AVISO: ${drive} nao mapeado, mas ${SOFT_UNC} acessivel — continuando`)
    return 0
  }

  emitLine(event, id, '> credenciais TI necessarias para continuar')
  return NEED_CREDENTIALS_CODE
}

function authenticatePath(event, id, user, password, uncRoot) {
  return new Promise(resolve => {
    const trimmedUser = String(user).trim()
    emitLine(event, id, `> autenticando acesso a ${uncRoot}`)
    emitLine(event, id, '$ [credenciais ocultadas]')

    const proc = spawn('net.exe', [
      'use',
      uncRoot,
      String(password),
      `/user:${trimmedUser}`,
      '/persistent:no',
    ], { shell: false, windowsHide: true })

    track(id, proc)
    streamLines(event, id, proc)
    proc.on('close', code => {
      untrack(id, proc)
      if (wasCancelled(id)) return resolve(-1)
      if (code === 0) emitLine(event, id, '> ✓ acesso de rede autenticado')
      else emitLine(event, id, `> ✗ falha ao autenticar (codigo ${code}) — confira usuario/senha e se tem permissao nesse servidor`)
      resolve(code)
    })
    proc.on('error', err => {
      untrack(id, proc)
      if (wasCancelled(id)) return resolve(-1)
      emitLine(event, id, `  [ERR] ${err.message}`)
      resolve(1)
    })
  })
}

/** @deprecated use mapSoftDriveWithCreds — mantido para compatibilidade de export */
function mapSoftDrive(event, id, user, password) {
  return mapSoftDriveWithCreds(event, id, user, password)
}

async function runScriptMapearSoft(event, { id, user, password }) {
  const code = await ensureSoftMapped(event, id, user, password)
  if (code === -1) return
  // Para "Mapear Soft", exige letra de unidade — nao basta UNC acessivel
  if (code === 0 && !(await isSoftMapped())) {
    emitLine(event, id, '> AVISO: compartilhamento acessivel, mas unidade nao mapeada')
    emitDone(event, id, 1)
    return
  }
  emitDone(event, id, code)
}

async function openOfficeInstaller(event, id, isNotebook) {
  const PATHS = getPaths()

  if (isNotebook) {
    emitLine(event, id, `> abrindo ${PATHS.OFFICE_365}`)
    try {
      const err = await shell.openPath(PATHS.OFFICE_365)
      if (err) {
        emitLine(event, id, `  [ERR] ${err} — tentando via CMD...`)
        if ((await runCmdTracked(event, id, PATHS.OFFICE_365_START)) === -1) return -1
        return 0
      }
      emitLine(event, id, '  ✓ instalador Office 365 aberto')
      return 0
    } catch (err) {
      emitLine(event, id, `  [ERR] ${err.message}`)
      return 1
    }
  }

  emitLine(event, id, `> abrindo ${PATHS.OFFICE_2016}`)
  if ((await runCmdTracked(event, id, PATHS.OFFICE_2016_START)) === -1) return -1
  return 0
}

async function runScriptNovaMaq(event, { id }) {
  emitLine(event, id, '> === Preparar maquina nova ===')

  if (wasCancelled(id)) return

  const host = await getHostname()
  if (wasCancelled(id)) return
  emitLine(event, id, `> hostname: ${host || '(desconhecido)'}`)

  const PATHS = getPaths()
  const nbPrefix = (PATHS.NOTEBOOK_PREFIX || 'NB').trim()
  const isNotebook = isNotebookHostname(host, PATHS.NOTEBOOK_PREFIX)
  emitLine(event, id, isNotebook ? `> tipo: NOTEBOOK (prefixo ${nbPrefix}) — Office 365` : `> tipo: DESKTOP — Office 2016`)

  const officeCode = await openOfficeInstaller(event, id, isNotebook)
  if (officeCode === -1) return
  if (officeCode !== 0) {
    emitDone(event, id, officeCode)
    return
  }

  emitLine(event, id, '> === fluxo iniciado — conclua instalacoes manualmente ===')
  emitDone(event, id, 0)
}

async function runScriptInventario(event, { id }, getMainWindow) {
  emitLine(event, id, '> === Inventario do usuario ===')
  emitLine(event, id, '> abrindo evidencias (Sobre, Device ID, Programas)...')

  try {
    await shell.openExternal('ms-settings:about')
    emitLine(event, id, '  ✓ Configuracoes > Sobre aberto')
  } catch (err) {
    emitLine(event, id, `  ✗ nao foi possivel abrir Configuracoes > Sobre: ${err.message}`)
  }
  await new Promise(r => setTimeout(r, 400))
  if (wasCancelled(id)) return
  if ((await runCmdTracked(event, id, 'hostname')) === -1) return
  if ((await runCmdTracked(event, id, 'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid')) === -1) return
  await new Promise(r => setTimeout(r, 300))
  if (wasCancelled(id)) return
  if ((await runCmdTracked(event, id, 'reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s /v DisplayName 2>nul | findstr /i DisplayName')) === -1) return

  const win = getMainWindow?.()
  if (win) {
    await dialog.showMessageBox(win, {
      type: 'info',
      title: 'TI Director Mode — Inventario',
      message: 'Capture as telas abertas',
      detail: '1) Configuracoes > Sobre o PC\n2) Device ID (registro acima)\n3) Lista de programas no terminal\n\nEnvie os prints no chamado de rollout.',
    })
  }

  emitLine(event, id, '> solicite print das 3 evidencias ao usuario')
  emitDone(event, id, 0)
}

function runScript(event, payload, getMainWindow) {
  const { scriptId } = payload
  switch (scriptId) {
    case 'SCRIPT_MAPEAR_SOFT':
      return runScriptMapearSoft(event, payload)
    case 'SCRIPT_NOVA_MAQ':
      return runScriptNovaMaq(event, payload)
    case 'SCRIPT_INVENTARIO':
      return runScriptInventario(event, payload, getMainWindow)
    default:
      emitLine(event, payload.id, `> script desconhecido: ${scriptId}`)
      emitDone(event, payload.id, 1)
  }
}

module.exports = {
  runScript,
  isSoftMapped,
  mapSoftDrive,
  ensureSoftMapped,
  authenticatePath,
  NEED_CREDENTIALS_CODE,
}
