const { spawn, exec } = require('child_process')
const iconv = require('iconv-lite')
const { shell } = require('electron')

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
    emitLine(event, id, '> interrompido pelo usuario (Ctrl+C)')
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

async function runDeployOpen(event, id, item) {
  emitLine(event, id, `> [Deploy] Abrindo: ${item.name || item.path}`)
  emitLine(event, id, `  caminho: ${item.path}`)
  try {
    const err = await shell.openPath(item.path)
    if (err) {
      emitLine(event, id, `  ✗ [ERR] ${err}`)
      return { ok: false, code: 1, error: err }
    }
    emitLine(event, id, `  ✓ ${item.name} aberto pelo Shell do Windows`)
    return { ok: true, code: 0 }
  } catch (ex) {
    emitLine(event, id, `  ✗ [ERR] ${ex.message}`)
    return { ok: false, code: 1, error: ex.message }
  }
}

/** Executa um item do módulo Deploy de forma sequencial e rastreada */
async function runDeployItemTracked(event, id, item) {
  if (wasCancelled(id)) return { ok: false, code: -1, cancelled: true }

  const cleanPath = (item.path || '').trim()
  if (!cleanPath) {
    emitLine(event, id, `> [Deploy] ✗ Caminho não informado para ${item.name || 'item'}`)
    return { ok: false, code: 1, error: 'Caminho não informado' }
  }

  if (item.type === 'open') {
    return await runDeployOpen(event, id, item)
  }

  const cleanArgs = (item.args || '').trim()
  const fullCmd = cleanArgs ? `"${cleanPath}" ${cleanArgs}` : `"${cleanPath}"`

  emitLine(event, id, `> [Deploy] Executando: ${item.name || cleanPath}`)
  emitLine(event, id, `  $ ${fullCmd}`)

  return new Promise(resolve => {
    let lastStderr = ''
    const onData = (d, prefix) => {
      d.toString().split('\n').forEach(l => {
        l = l.replace(/\r/g, '').trim()
        if (l) {
          if (prefix || l.toLowerCase().includes('não é reconhecido') || l.toLowerCase().includes('not recognized')) {
            lastStderr = l
          }
          emitLine(event, id, prefix ? `  ${prefix}${l}` : `  ${l}`)
        }
      })
    }
    proc.stdout?.on('data', d => onData(d, ''))
    proc.stderr?.on('data', d => onData(d, '[ERR] '))

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
        let hint = explainExitCode(exitCode)
        if (nonExecExts.has(ext) || lastStderr.toLowerCase().includes('não é reconhecido') || lastStderr.toLowerCase().includes('not recognized')) {
          hint = `Arquivo .${ext || 'informado'} não é um executável nativo do CMD. Se você deseja apenas abrir este arquivo/pasta, altere o Tipo para 'Abrir arquivo (Shell)' em Configurações.`
        }
        emitLine(event, id, `  ✗ [Deploy] ${item.name} finalizado com erro (código ${exitCode})${hint ? ` — ${hint}` : ''}`)
        resolve({ ok: false, code: exitCode, error: hint || `Código ${exitCode}` })
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
  runDeployItemTracked,
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

