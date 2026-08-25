const { spawn } = require('child_process')
const iconv = require('iconv-lite')
const { getHostname, validateHostname } = require('./hostname')
const { checkIsAdmin } = require('./adminCheck')

const WINDOWS_HOSTNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,13}[A-Za-z0-9])?$/

function validateStrictPayload(payload, allowedKeys) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const keys = Object.keys(payload)
  return keys.length === allowedKeys.length && keys.every(key => allowedKeys.includes(key))
}

function validateHostnameCandidate(hostname, pattern) {
  if (typeof hostname !== 'string') return { ok: false, error: 'Hostname inválido' }
  const normalized = hostname.trim().toUpperCase()
  if (!WINDOWS_HOSTNAME_PATTERN.test(normalized) || /^\d+$/.test(normalized)) {
    return { ok: false, error: 'Hostname incompatível com as regras do Windows' }
  }
  const validation = validateHostname(normalized, pattern)
  if (validation.status === 'invalid-pattern') return { ok: false, error: 'Configuração de hostname inválida', status: validation.status }
  if (validation.status !== 'match') return { ok: false, error: 'Hostname fora do padrão configurado', status: validation.status }
  return { ok: true, hostname: normalized, status: validation.status }
}

function runWindowsProcess(executable, args, spawnProcess = spawn) {
  return new Promise(resolve => {
    let settled = false
    const stdout = []
    const stderr = []
    const finish = result => {
      if (settled) return
      settled = true
      resolve({
        ...result,
        stdout: iconv.decode(Buffer.concat(stdout), 'cp850'),
        stderr: iconv.decode(Buffer.concat(stderr), 'cp850'),
      })
    }
    const proc = spawnProcess(executable, args, { windowsHide: true, shell: false })
    proc.stdout?.on('data', chunk => stdout.push(Buffer.from(chunk)))
    proc.stderr?.on('data', chunk => stderr.push(Buffer.from(chunk)))
    proc.on('error', err => finish({ ok: false, exitCode: null, error: err.message }))
    proc.on('close', exitCode => finish(exitCode === 0
      ? { ok: true, exitCode }
      : { ok: false, exitCode, error: `Operação encerrada com código ${exitCode}` }))
  })
}

function buildWmicRenameArgs(currentHostname, newHostname) {
  return ['computersystem', 'where', `name='${currentHostname}'`, 'call', 'rename', `name=${newHostname}`]
}

function parseWmicReturnValue(stdout) {
  const match = String(stdout || '').match(/\bReturnValue\s*=\s*(\d+)\s*;?/i)
  return match ? Number(match[1]) : null
}

function parseRegistryComputerName(stdout) {
  const match = String(stdout || '').match(/^\s*ComputerName\s+REG_SZ\s+(.+?)\s*$/im)
  return match ? match[1].trim().toUpperCase() : ''
}

async function readPendingHostname(runProcess = runWindowsProcess) {
  const result = await runProcess('reg.exe', [
    'query',
    'HKLM\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName',
    '/v',
    'ComputerName',
  ])
  return {
    ...result,
    hostname: result.ok ? parseRegistryComputerName(result.stdout) : '',
  }
}

function createMachinePreparationController({ loadConfig, stateStore, readHostname = getHostname, readPending = readPendingHostname, isAdmin = checkIsAdmin, runProcess = runWindowsProcess, logError = console.error }) {
  let operationInProgress = false

  const status = async () => {
    const config = loadConfig()
    const hostname = (await readHostname()).trim().toUpperCase()
    const pending = stateStore.read()
    if (pending?.invalid) {
      return { ok: false, blocked: true, pending: true, hostname, error: 'Estado de preparação pendente inválido' }
    }
    if (pending) {
      if (hostname && hostname === pending.expectedHostname) {
        stateStore.clear()
        return {
          ok: true,
          blocked: false,
          pending: false,
          hostname,
          validation: validateHostname(hostname, config?.hostname?.pattern),
          expectedFormat: config?.hostname?.patternDescription || config?.hostname?.pattern || '',
          resumed: true,
        }
      }
      return {
        ok: true,
        blocked: true,
        pending: true,
        hostname,
        expectedHostname: pending.expectedHostname,
        reason: pending.reason,
        expectedFormat: config?.hostname?.patternDescription || config?.hostname?.pattern || '',
      }
    }
    return {
      ok: true,
      blocked: false,
      pending: false,
      hostname,
      validation: validateHostname(hostname, config?.hostname?.pattern),
      expectedFormat: config?.hostname?.patternDescription || config?.hostname?.pattern || '',
      elevated: await isAdmin(),
    }
  }

  const validateCandidate = payload => {
    if (!validateStrictPayload(payload, ['hostname'])) return { ok: false, error: 'Payload inválido' }
    const config = loadConfig()
    return validateHostnameCandidate(payload.hostname, config?.hostname?.pattern)
  }

  const rename = async payload => {
    if (operationInProgress) return { ok: false, error: 'Operação já em andamento' }
    if (stateStore.read()) return { ok: false, error: 'Reinício pendente bloqueia nova alteração' }
    const candidate = validateCandidate(payload)
    if (!candidate.ok) return candidate
    if (!await isAdmin()) {
      return {
        ok: false,
        elevated: false,
        error: 'Privilégios de Administrador são necessários para alterar o hostname. A correção automática não está disponível sem elevação.',
      }
    }
    operationInProgress = true
    try {
      const currentHostname = (await readHostname()).trim().toUpperCase()
      if (!currentHostname) return { ok: false, error: 'Hostname atual indisponível' }
      const args = buildWmicRenameArgs(currentHostname, candidate.hostname)
      const result = await runProcess('wmic.exe', args)
      const returnValue = parseWmicReturnValue(result.stdout)
      if (!result.ok || returnValue !== 0) {
        const diagnostic = {
          exitCode: result.exitCode ?? result.code ?? null,
          returnValue,
          stderr: String(result.stderr || '').trim() || null,
          error: result.error || (returnValue === null ? 'WMIC não retornou ReturnValue' : `WMIC Rename retornou ${returnValue}`),
        }
        logError('[machine-preparation] Falha no rename:', diagnostic)
        return {
          ok: false,
          error: 'O Windows não confirmou a alteração do hostname',
          exitCode: diagnostic.exitCode,
          returnValue,
          technicalError: diagnostic.error,
        }
      }
      const pendingResult = await readPending(runProcess)
      if (!pendingResult.ok || pendingResult.hostname !== candidate.hostname) {
        const diagnostic = {
          exitCode: pendingResult.exitCode ?? pendingResult.code ?? null,
          pendingHostnameMatches: false,
          stderr: String(pendingResult.stderr || '').trim() || null,
          error: pendingResult.error || 'Hostname pendente do Windows diverge do esperado',
        }
        logError('[machine-preparation] Estado pendente inconsistente:', diagnostic)
        return {
          ok: false,
          error: 'O Windows aceitou a solicitação, mas o hostname pendente não corresponde ao esperado',
          returnValue,
          technicalError: diagnostic.error,
        }
      }
      stateStore.write(candidate.hostname)
      return { ok: true, pending: true, expectedHostname: candidate.hostname, reason: 'hostname_change' }
    } finally {
      operationInProgress = false
    }
  }

  const restart = async payload => {
    if (!validateStrictPayload(payload, [])) return { ok: false, error: 'Payload inválido' }
    if (operationInProgress) return { ok: false, error: 'Operação já em andamento' }
    const pending = stateStore.read()
    if (!pending || pending.invalid) return { ok: false, error: 'Não existe reinício de hostname pendente' }
    operationInProgress = true
    try {
      return await runProcess('shutdown.exe', ['/r', '/t', '0'])
    } finally {
      operationInProgress = false
    }
  }

  const canContinue = async () => {
    const current = await status()
    return { ok: current.ok && !current.blocked, blocked: Boolean(current.blocked), error: current.error }
  }

  return { status, validateCandidate, rename, restart, canContinue }
}

module.exports = {
  buildWmicRenameArgs,
  createMachinePreparationController,
  parseRegistryComputerName,
  parseWmicReturnValue,
  readPendingHostname,
  validateHostnameCandidate,
  validateStrictPayload,
  runWindowsProcess,
  WINDOWS_HOSTNAME_PATTERN,
}
