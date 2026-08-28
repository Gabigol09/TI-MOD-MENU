const { spawn, exec } = require('child_process')
const iconv = require('iconv-lite')
const { shell } = require('electron')
const { normalizeConfiguredPath } = require('./configuredPath')

const WINDOWS_COMMAND_ENCODING = 'cp850'

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

function emitReply(event, channel, payload) {
  if (!event) return
  if (typeof event.reply === 'function') {
    event.reply(channel, payload)
  } else if (event.sender && typeof event.sender.send === 'function') {
    event.sender.send(channel, payload)
  }
}

function emitLine(event, id, line) {
  emitReply(event, 'cmd-line', { id, line })
}

function emitDone(event, id, code, cancelled = false) {
  emitReply(event, 'cmd-done', { id, code, cancelled })
}

function stopRun(id, event) {
  const list = activeById.get(id)
  if (!list?.length) {
    // Mesmo sem processo filho ativo no momento, marca como cancelado para interromper a fila
    cancelledIds.add(id)
    if (event) {
      emitLine(event, id, '> interrompido pelo usuario')
      emitDone(event, id, -1, true)
    }
    return true
  }
  cancelledIds.add(id)
  for (const proc of [...list]) killProcessTree(proc)
  activeById.delete(id)
  if (event) {
      emitLine(event, id, '> interrompido pelo usuário')
    emitDone(event, id, -1, true)
  }
  return true
}

function wasCancelled(id) {
  if (!cancelledIds.has(id)) return false
  cancelledIds.delete(id)
  return true
}

function createWindowsLineDecoder(onLine, encoding = WINDOWS_COMMAND_ENCODING) {
  const decoder = iconv.getDecoder(encoding)
  let pending = ''

  const emitCompleteLines = () => {
    const lines = pending.split('\n')
    pending = lines.pop() || ''
    lines.forEach(line => onLine(line.replace(/\r$/, '')))
  }

  return {
    write(chunk) {
      pending += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      emitCompleteLines()
    },
    end() {
      const finalChunk = decoder.end()
      if (finalChunk) pending += finalChunk
      if (pending) onLine(pending.replace(/\r$/, ''))
      pending = ''
    },
  }
}

function streamLines(event, id, proc, onOutputLine) {
  const attach = (stream, prefix) => {
    if (!stream) return
    const decoder = createWindowsLineDecoder(line => {
      const trimmed = line.trim()
      if (!trimmed) return
      if (onOutputLine) onOutputLine(trimmed, prefix)
      emitLine(event, id, prefix ? `  ${prefix}${trimmed}` : `  ${trimmed}`)
    })
    stream.on('data', chunk => decoder.write(chunk))
    stream.on('end', () => decoder.end())
  }

  attach(proc.stdout, '')
  attach(proc.stderr, '[ERR] ')
}

function runCmd(event, { id, cmd, silent }) {
  if (silent) emitLine(event, id, '$ [credenciais ocultadas]')
  else emitLine(event, id, `$ ${cmd}`)

  const proc = spawn('cmd.exe', ['/c', cmd], { shell: false, windowsHide: true })
  track(id, proc)
  streamLines(event, id, proc)

  proc.on('close', code => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    if (code && code !== 0) {
      const hint = explainExitCode(code)
      emitLine(event, id, `  ✗ encerrado com codigo ${code}${hint ? ` — ${hint}` : ''}`)
    }
    emitDone(event, id, code ?? 1)
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    emitLine(event, id, `  [ERRO] ${err.message}`)
    emitDone(event, id, 1)
  })
  return proc
}

// Traduz codigos de saida comuns do cmd.exe/Windows para uma dica legivel.
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
  emitLine(event, id, `$ abrindo: ${cmd}`)
  const proc = exec(cmd, { shell: true, windowsHide: false })
  track(id, proc)
  streamLines(event, id, proc)
  proc.on('close', code => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    if (!OPEN_SUCCESS_CODES.has(code)) {
      const hint = explainExitCode(code)
      emitLine(event, id, `  ✗ falhou (codigo ${code})${hint ? ` — ${hint}` : ''}`)
    } else if (code === 0) {
      emitLine(event, id, '  ✓ sucesso')
    } else {
      emitLine(event, id, `  ✓ sucesso (codigo ${code} — instalador pede reinicializacao)`)
    }
    emitDone(event, id, code ?? 0)
  })
  proc.on('error', err => {
    untrack(id, proc)
    if (activeById.has(id) || wasCancelled(id)) return
    emitLine(event, id, `  ✗ [ERRO] ${err.message}`)
    emitDone(event, id, 1)
  })
  return proc
}

/** Executa processo nativo com executable/args fixos pelo backend, mantendo tracking e cancelamento. */
function runProcessTracked(event, id, executable, args = [], opts = {}) {
  const { timeoutMs = 30000, successCodes = [0], prefix = '' } = opts
  return new Promise(resolve => {
    const proc = spawn(executable, args, { shell: false, windowsHide: true })
    track(id, proc)
    streamLines(event, id, proc)
    let settled = false
    let timer = null

    const finish = (code, error = null) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      untrack(id, proc)
      const cancelled = wasCancelled(id)
      const ok = !cancelled && successCodes.includes(code)
      if (!ok && !cancelled) emitLine(event, id, `  ✗ ${prefix}falhou (codigo ${code ?? 1})${error ? ` — ${error}` : ''}`)
      resolve({ ok, code: code ?? 1, cancelled, error })
    }

    proc.on('close', code => finish(code))
    proc.on('error', err => finish(1, err.message))
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        killProcessTree(proc)
        finish(1, 'timeout')
      }, timeoutMs)
    }
  })
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

async function runDeployOpen(event, id, item, openPath = target => shell.openPath(target)) {
  emitLine(event, id, `> [Deploy] Abrindo: ${item.name || item.path}`)
  emitLine(event, id, `  caminho: ${item.path}`)
  try {
    const err = await openPath(item.path)
    if (err) {
      emitLine(event, id, `  ✗ [ERR] ${err}`)
      return { ok: false, code: 1, error: err, errorType: 'configuration' }
    }
    emitLine(event, id, `  → ${item.name} aberto pelo Shell do Windows; término não rastreável`)
    return { ok: false, code: null, started: true, untracked: true }
  } catch (ex) {
    emitLine(event, id, `  ✗ [ERR] ${ex.message}`)
    return { ok: false, code: 1, error: ex.message, errorType: 'technical' }
  }
}

function validateDeployItemType(item, cleanPath) {
  const extension = cleanPath.split('.').pop()?.toLowerCase() || ''
  if (item.type === 'script' && !['bat', 'cmd'].includes(extension)) {
    return { ok: false, error: 'Tipo Script aceita somente arquivos .bat ou .cmd', errorType: 'configuration' }
  }
  if (item.type === 'executable' && !['exe', 'msi'].includes(extension)) {
    return { ok: false, error: 'Tipo Executável aceita somente arquivos .exe ou .msi', errorType: 'configuration' }
  }
  if (!['script', 'executable', 'open'].includes(item.type)) {
    return { ok: false, error: 'Tipo de execução inválido', errorType: 'configuration' }
  }
  return { ok: true, extension }
}

function buildDeployCommand(item, cleanPath, cleanArgs) {
  if (item.type === 'executable' && cleanPath.toLowerCase().endsWith('.msi')) {
    return cleanArgs ? `msiexec.exe /i "${cleanPath}" ${cleanArgs}` : `msiexec.exe /i "${cleanPath}"`
  }
  return cleanArgs ? `"${cleanPath}" ${cleanArgs}` : `"${cleanPath}"`
}

function buildCmdInvocation(fullCmd, showConsole = false) {
  if (showConsole) {
    const interactiveCmd = `cmd.exe /d /s /c "${fullCmd}"`
    return {
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', `start "" /wait ${interactiveCmd}`],
      options: { shell: false, windowsHide: true, windowsVerbatimArguments: true },
    }
  }
  return {
    executable: 'cmd.exe',
    args: ['/d', '/s', '/c', `"${fullCmd}"`],
    options: { shell: false, windowsHide: true, windowsVerbatimArguments: true },
  }
}

/** Executa scripts e instaladores do módulo Deploy de forma sequencial e rastreada */
async function runDeployItemTracked(event, id, item, spawnProcess = spawn, openPath) {
  if (wasCancelled(id)) return { ok: false, code: -1, cancelled: true }

  const pathNormalization = normalizeConfiguredPath(item.path || '')
  if (!pathNormalization.ok || !pathNormalization.value) {
    const error = pathNormalization.error || 'Caminho não informado'
    emitLine(event, id, `> [Deploy] ✗ ${error} para ${item.name || 'item'}`)
    return { ok: false, code: 1, error, errorType: 'configuration' }
  }
  const cleanPath = pathNormalization.value

  const typeValidation = validateDeployItemType(item, cleanPath)
  if (!typeValidation.ok) {
    emitLine(event, id, `> [Deploy] ✗ ${typeValidation.error}`)
    return { ok: false, code: 1, error: typeValidation.error, errorType: typeValidation.errorType }
  }

  if (item.type === 'open') {
    return await runDeployOpen(event, id, item, openPath)
  }

  const cleanArgs = (item.args || '').trim()
  const fullCmd = buildDeployCommand(item, cleanPath, cleanArgs)

  const showConsole = item.type === 'script' && item.showConsole === true
  emitLine(event, id, `> [Deploy] Executando: ${item.name || cleanPath}`)
  emitLine(event, id, `  $ ${fullCmd}`)
  if (showConsole) emitLine(event, id, '  → console visível; saída e interação ocorrem na janela CMD')

  return new Promise(resolve => {
    const invocation = buildCmdInvocation(fullCmd, showConsole)
    const proc = spawnProcess(invocation.executable, invocation.args, invocation.options)
    track(id, proc)
    let lastStderr = ''
    streamLines(event, id, proc, (line, prefix) => {
      if (prefix || line.toLowerCase().includes('não é reconhecido') || line.toLowerCase().includes('not recognized')) {
        lastStderr = line
      }
    })

    let settled = false
    const finish = (code) => {
      if (settled) return
      settled = true
      untrack(id, proc)
      if (wasCancelled(id)) {
        emitLine(event, id, `  > [Deploy] ${item.name} interrompido`)
        return resolve({ ok: false, code: -1, cancelled: true })
      }
      const exitCode = code ?? 0
      const isSuccess = OPEN_SUCCESS_CODES.has(exitCode)
      if (isSuccess) {
        if (exitCode === 0) {
          emitLine(event, id, `  ✓ [Deploy] ${item.name} concluído com sucesso`)
        } else {
          emitLine(event, id, `  ✓ [Deploy] ${item.name} concluído com sucesso (código ${exitCode} — requer reinicialização)`)
        }
        resolve({ ok: true, code: exitCode })
      } else {
        const ext = cleanPath.split('.').pop()?.toLowerCase() || ''
        const nonExecExts = new Set(['txt', 'png', 'jpg', 'jpeg', 'pdf', 'zip', 'rar', '7z', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'iso', 'xml', 'json', 'log'])
        let hint = exitCode === 1 ? 'falha operacional — veja stdout/stderr acima' : explainExitCode(exitCode)
        const configurationError = [2, 3, 53, 67].includes(exitCode) || nonExecExts.has(ext) || lastStderr.toLowerCase().includes('não é reconhecido') || lastStderr.toLowerCase().includes('not recognized')
        if (nonExecExts.has(ext) || lastStderr.toLowerCase().includes('não é reconhecido') || lastStderr.toLowerCase().includes('not recognized')) {
          hint = `Arquivo .${ext || 'informado'} não é um executável nativo do CMD. Se você deseja apenas abrir este arquivo/pasta, altere o Tipo para 'Abrir arquivo (Shell)' em Configurações.`
        }
        emitLine(event, id, `  ✗ [Deploy] ${item.name} finalizado com erro (código ${exitCode})${hint ? ` — ${hint}` : ''}`)
        resolve({ ok: false, code: exitCode, error: hint || `Código ${exitCode}`, errorType: configurationError ? 'configuration' : 'technical' })
      }
    }

    proc.on('close', finish)
    proc.on('error', err => {
      if (settled) return
      settled = true
      untrack(id, proc)
      emitLine(event, id, `  ✗ [Deploy] [ERRO] ${err.message}`)
      resolve({ ok: false, code: 1, error: err.message })
    })
  })
}

module.exports = {
  runCmd,
  runOpen,
  stopRun,
  runCmdTracked,
  runProcessTracked,
  runDeployItemTracked,
  buildCmdInvocation,
  buildDeployCommand,
  validateDeployItemType,
  track,
  untrack,
  wasCancelled,
  emitLine,
  emitDone,
  emitReply,
  createWindowsLineDecoder,
  streamLines,
  WINDOWS_COMMAND_ENCODING,
}

