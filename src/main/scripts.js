// Scripts de rollout — somente cmd.exe / exec / dialog (sem PowerShell)

const { spawn, exec } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { dialog } = require('electron')
const { getPaths } = require('./corporatePaths')
const {
  runCmdTracked,
  track,
  untrack,
  emitLine,
  wasCancelled,
} = require('./processRunner')

function emitDone(event, id, code) {
  event.reply('cmd-done', { id, code })
}

function isSoftMapped() {
  return new Promise(resolve => {
    exec('net use S:', { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(false)
      const s = stdout.toLowerCase()
      resolve(
        s.includes('ok') ||
        s.includes('feita corretamente') ||
        s.includes('connected') ||
        (s.includes('s:') && !s.includes('nao foi encontrad') && !s.includes('not found'))
      )
    })
  })
}

function mapSoftDrive(event, id, user, password) {
  const PATHS = getPaths()
  return new Promise(resolve => {
    const batPath = path.join(os.tmpdir(), `ti-map-${Date.now()}.bat`)
    const safePass = String(password).replace(/"/g, '""')
    const safeUser = String(user).trim()
    const content = [
      '@echo off',
      `net use ${PATHS.SOFT_DRIVE} ${PATHS.SOFT_UNC} "${safePass}" /user:${safeUser} /persistent:yes`,
      'exit /b %ERRORLEVEL%',
    ].join('\r\n')

    fs.writeFileSync(batPath, content, 'utf8')
    emitLine(event, id, `> mapeando ${PATHS.SOFT_DRIVE} -> ${PATHS.SOFT_UNC}`)
    emitLine(event, id, '$ [credenciais ocultadas]')

    const proc = spawn('cmd.exe', ['/c', batPath], { shell: false, windowsHide: true })
    track(id, proc)
    proc.stdout.on('data', d => {
      d.toString().split('\n').forEach(l => {
        l = l.replace(/\r/g, '').trim()
        if (l) emitLine(event, id, `  ${l}`)
      })
    })
    proc.stderr.on('data', d => {
      d.toString().split('\n').forEach(l => {
        l = l.replace(/\r/g, '').trim()
        if (l) emitLine(event, id, `  [ERR] ${l}`)
      })
    })
    proc.on('close', code => {
      fs.unlink(batPath, () => {})
      untrack(id, proc)
      if (wasCancelled(id)) return resolve(-1)
      if (code === 0) emitLine(event, id, '> OK unidade S: mapeada')
      else emitLine(event, id, '> AVISO falha no mapeamento — verifique usuario/senha e rede')
      resolve(code ?? 1)
    })
    proc.on('error', err => {
      fs.unlink(batPath, () => {})
      untrack(id, proc)
      if (wasCancelled(id)) return resolve(-1)
      emitLine(event, id, `  [ERRO] ${err.message}`)
      resolve(1)
    })
  })
}

function getHostname() {
  return new Promise(resolve => {
    exec('hostname', { windowsHide: true, timeout: 3000 }, (err, stdout) => {
      resolve(err ? '' : stdout.replace(/\r/g, '').trim())
    })
  })
}

async function runScriptMapearSoft(event, { id, user, password }) {
  if (!user || !password) {
    emitLine(event, id, '> AVISO credenciais obrigatorias (DOMINIO\\usuario)')
    emitDone(event, id, 1)
    return
  }
  const code = await mapSoftDrive(event, id, user, password)
  if (code === -1) return
  emitDone(event, id, code)
}

async function runScriptNovaMaq(event, { id, user, password }) {
  const PATHS = getPaths()
  emitLine(event, id, '> === Preparar maquina nova ===')

  if (!(await isSoftMapped())) {
    if (!user || !password) {
      emitLine(event, id, '> AVISO S: nao mapeado — informe credenciais TI')
      emitDone(event, id, 2)
      return
    }
    const mapCode = await mapSoftDrive(event, id, user, password)
    if (mapCode === -1) return
    if (mapCode !== 0) {
      emitDone(event, id, mapCode)
      return
    }
  } else {
    emitLine(event, id, '> S: ja mapeado ✓')
  }

  const host = await getHostname()
  emitLine(event, id, `> hostname: ${host || '(desconhecido)'}`)
  const isNotebook = /^NB/i.test(host)
  emitLine(event, id, isNotebook ? '> tipo: NOTEBOOK — Office 365' : '> tipo: DESKTOP — Office 2016')

  const officeStart = isNotebook ? PATHS.OFFICE_365_START : PATHS.OFFICE_2016_START
  if ((await runCmdTracked(event, id, officeStart)) === -1) return

  emitLine(event, id, '> === fluxo iniciado — conclua instalacoes manualmente ===')
  emitDone(event, id, 0)
}

async function runScriptInventario(event, { id }, getMainWindow) {
  emitLine(event, id, '> === Inventario do usuario ===')
  emitLine(event, id, '> abrindo evidencias (Sobre, Device ID, Programas)...')

  if ((await runCmdTracked(event, id, 'start ms-settings:about')) === -1) return
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

module.exports = { runScript, isSoftMapped, mapSoftDrive }
