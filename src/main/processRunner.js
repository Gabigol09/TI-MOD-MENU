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
    if (code && code !== 0) {
      const hint = explainExitCode(code)
      event.reply('cmd-line', { id, line: `  ✗ encerrado com codigo ${code}${hint ? ` — ${hint}` : ''}` })
    }
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

// Traduz codigos de saida comuns do cmd.exe/Windows para uma dica legivel.
// O exit code sozinho quase nunca diz o motivo real (ex: falha de rede e
// "arquivo nao encontrado" as vezes retornam o mesmo 1) — por isso o mais
// importante e mesmo o texto de erro (stderr), que agora e exibido acima
// desta linha via streamLines(). Isto e so um resumo complementar.
function explainExitCode(code) {
  const hints = {
    0:  null,
    1:  'falha generica — normalmente caminho inacessivel, sem permissao/autenticacao de rede para este servidor, ou arquivo nao encontrado. Veja a mensagem [ERR] acima.',
    2:  'arquivo ou caminho nao encontrado',
    5:  'acesso negado — usuario atual nao tem permissao neste caminho',
    53: 'caminho de rede nao encontrado — servidor pode estar offline, fora da VPN, ou sem autenticacao para este usuario',
    67: 'nome de rede nao encontrado',
    1223: 'operacao cancelada pelo usuario (ex: fechou um prompt do Windows)',
  }
  return hints[code] !== undefined ? hints[code] : `codigo ${code} nao mapeado — veja a mensagem [ERR] acima, se houver`
}

const OPEN_SUCCESS_CODES = new Set([0, 3010, 1641]) // 3010/1641 = MSI ok, requer reboot

function runOpen(event, { id, cmd }) {
  event.reply('cmd-line', { id, line: `$ abrindo: ${cmd}` })
  const proc = exec(cmd, { shell: true, windowsHide: false })
  track(id, proc)
  streamLines(event, id, proc)
  proc.on('close', code => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    if (!OPEN_SUCCESS_CODES.has(code)) {
      const hint = explainExitCode(code)
      event.reply('cmd-line', { id, line: `  ✗ falhou (codigo ${code})${hint ? ` — ${hint}` : ''}` })
    } else if (code === 0) {
      event.reply('cmd-line', { id, line: '  ✓ sucesso' })
    } else {
      event.reply('cmd-line', { id, line: `  ✓ sucesso (codigo ${code} — instalador pede reinicializacao)` })
    }
    event.reply('cmd-done', { id, code: code ?? 0 })
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    event.reply('cmd-line', { id, line: `  ✗ [ERRO] ${err.message}` })
    event.reply('cmd-done', { id, code: 1 })
  })
  return proc
}

/** Para scripts: spawn rastreado com Promise. timeoutMs = 0 desativa. */
function runCmdTracked(event, id, cmd, opts = {}) {
  const { silent = false, timeoutMs = 30000 } = opts
  return new Promise(resolve => {
    if (!silent) emitLine(event, id, `$ ${cmd}`)
    else emitLine(event, id, '$ [credenciais ocultadas]')

    const proc = spawn('cmd.exe', ['/c', cmd], { shell: false, windowsHide: true })
    track(id, proc)
    streamLines(event, id, proc)

    let settled = false
    const timer = timeoutMs > 0 ? setTimeout(() => {
      if (settled) return
      settled = true
      emitLine(event, id, `  ✗ sem resposta em ${Math.round(timeoutMs / 1000)}s — encerrado automaticamente`)
      killProcessTree(proc)
      untrack(id, proc)
      resolve(1)
    }, timeoutMs) : null

    const finish = (code) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
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

module.exports = {
  runCmd,
  runOpen,
  stopRun,
  runCmdTracked,
  track,
  untrack,
  wasCancelled,
  emitLine,
}
