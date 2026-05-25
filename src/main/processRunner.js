// Execução e interrupção de processos CMD (taskkill /T — sem PowerShell)

const { spawn, exec } = require('child_process')

/** @type {Map<string, import('child_process').ChildProcess[]>} */
const activeById = new Map()
/** @type {Set<string>} */
const cancelledIds = new Set()

function track(id, proc) {
  if (!activeById.has(id)) activeById.set(id, [])
  activeById.get(id).push(proc)
}

function untrack(id, proc) {
  const list = activeById.get(id)
  if (!list) return
  const next = list.filter(p => p !== proc)
  if (next.length) activeById.set(id, next)
  else activeById.delete(id)
}

function killProcessTree(proc) {
  if (!proc || proc.killed) return
  const pid = proc.pid
  if (pid) {
    exec(`taskkill /PID ${pid} /T /F`, { windowsHide: true }, () => {})
  } else {
    try { proc.kill() } catch { /* ignore */ }
  }
}

function stopRun(id, event) {
  const list = activeById.get(id)
  if (!list?.length) return false
  cancelledIds.add(id)
  for (const proc of [...list]) killProcessTree(proc)
  activeById.delete(id)
  if (event) {
    event.reply('cmd-line', { id, line: '> interrompido pelo usuario (Ctrl+C)' })
    event.reply('cmd-done', { id, code: -1, cancelled: true })
  }
  return true
}

function wasCancelled(id) {
  if (!cancelledIds.has(id)) return false
  cancelledIds.delete(id)
  return true
}

function streamLines(event, id, proc) {
  const onData = (d, prefix) => {
    d.toString().split('\n').forEach(l => {
      l = l.replace(/\r/g, '').trim()
      if (l) event.reply('cmd-line', { id, line: prefix ? `  ${prefix}${l}` : `  ${l}` })
    })
  }
  proc.stdout?.on('data', d => onData(d, ''))
  proc.stderr?.on('data', d => onData(d, '[ERR] '))
}

function runCmd(event, { id, cmd, silent }) {
  if (silent) event.reply('cmd-line', { id, line: '$ [credenciais ocultadas]' })
  else event.reply('cmd-line', { id, line: `$ ${cmd}` })

  const proc = spawn('cmd.exe', ['/c', cmd], { shell: false, windowsHide: true })
  track(id, proc)
  streamLines(event, id, proc)

  proc.on('close', code => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    event.reply('cmd-done', { id, code: code ?? 1 })
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    event.reply('cmd-line', { id, line: `  [ERRO] ${err.message}` })
    event.reply('cmd-done', { id, code: 1 })
  })
  return proc
}

function runOpen(event, { id, cmd }) {
  event.reply('cmd-line', { id, line: `$ abrindo: ${cmd}` })
  const proc = exec(cmd, { shell: true, windowsHide: false })
  track(id, proc)
  proc.on('close', code => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    if (code !== 0) event.reply('cmd-line', { id, line: `  encerrado codigo ${code}` })
    else event.reply('cmd-line', { id, line: '  ok' })
    event.reply('cmd-done', { id, code: code ?? 0 })
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    event.reply('cmd-line', { id, line: `  [ERRO] ${err.message}` })
    event.reply('cmd-done', { id, code: 1 })
  })
  return proc
}

/** Para scripts: spawn rastreado com Promise */
function runCmdTracked(event, id, cmd, opts = {}) {
  const { silent = false } = opts
  return new Promise(resolve => {
    if (!silent) emitLine(event, id, `$ ${cmd}`)
    else emitLine(event, id, '$ [credenciais ocultadas]')

    const proc = spawn('cmd.exe', ['/c', cmd], { shell: false, windowsHide: true })
    track(id, proc)
    streamLines(event, id, proc)

    const finish = (code) => {
      untrack(id, proc)
      if (wasCancelled(id)) return resolve(-1)
      if (!activeById.has(id)) resolve(code ?? 1)
    }
    proc.on('close', finish)
    proc.on('error', () => finish(1))
  })
}

function emitLine(event, id, line) {
  event.reply('cmd-line', { id, line })
}

function isCancelled(id) {
  return !activeById.has(id)
}

module.exports = {
  runCmd,
  runOpen,
  stopRun,
  runCmdTracked,
  track,
  untrack,
  isCancelled,
  emitLine,
}
