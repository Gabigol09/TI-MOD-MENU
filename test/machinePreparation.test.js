import { describe, expect, it, vi } from 'vitest'
import preparation from '../src/main/machinePreparation.js'

const { buildWmicRenameArgs, createMachinePreparationController, parseRegistryComputerName, parseWmicReturnValue, readPendingHostname, validateHostnameCandidate, validateStrictPayload } = preparation
const pattern = '^[A-Za-z]{2}\\d{5}S$'
const loadConfig = () => ({ hostname: { pattern, patternDescription: 'AA#####S' } })

function createStore(initial = null) {
  let state = initial
  return {
    read: vi.fn(() => state),
    write: vi.fn(expectedHostname => {
      state = { pending: true, expectedHostname, reason: 'hostname_change' }
      return state
    }),
    clear: vi.fn(() => { state = null }),
  }
}

function createController({ current = 'AB12345S', pending = null, processResult = { ok: true, exitCode: 0, stdout: 'ReturnValue = 0;', stderr: '' }, pendingHostname = 'CD54321S', elevated = true } = {}) {
  const stateStore = createStore(pending)
  const runProcess = vi.fn(async () => processResult)
  const readPending = vi.fn(async () => ({ ok: true, exitCode: 0, hostname: pendingHostname, stdout: '', stderr: '' }))
  const isAdmin = vi.fn(async () => elevated)
  const logError = vi.fn()
  return {
    controller: createMachinePreparationController({ loadConfig, stateStore, readHostname: async () => current, readPending, isAdmin, runProcess, logError }),
    stateStore,
    runProcess,
    readPending,
    isAdmin,
    logError,
  }
}

describe('machine preparation hostname validation', () => {
  it('aprova hostname atual válido', async () => {
    const { controller } = createController()
    const result = await controller.status()
    expect(result.validation).toEqual({ status: 'match' })
    expect(result.blocked).toBe(false)
  })

  it('identifica hostname atual inválido', async () => {
    const { controller } = createController({ current: 'DESKTOP-TESTE' })
    expect((await controller.status()).validation).toEqual({ status: 'mismatch' })
  })

  it('aceita novo hostname válido', () => {
    expect(validateHostnameCandidate('ab12345s', pattern)).toEqual({ ok: true, hostname: 'AB12345S', status: 'match' })
  })

  it('rejeita novo hostname inválido', () => {
    expect(validateHostnameCandidate('nome inválido & comando', pattern).ok).toBe(false)
  })

  it('rejeita configuração regex inválida', () => {
    expect(validateHostnameCandidate('AB12345S', '[').status).toBe('invalid-pattern')
  })
})

describe('machine preparation transitions', () => {
  it('monta argv direto do WMIC sem aspas de shell no nome novo', () => {
    expect(buildWmicRenameArgs('AB12345S', 'CD54321S')).toEqual([
      'computersystem', 'where', "name='AB12345S'", 'call', 'rename', 'name=CD54321S',
    ])
  })

  it('interpreta ReturnValue com variações de espaços e quebras', () => {
    expect(parseWmicReturnValue('\r\nExecuting (...)\r\nMethod execution successful.\r\nOut Parameters:\r\ninstance of __PARAMETERS\r\n{\r\n    ReturnValue   =   0 ;\r\n};\r\n')).toBe(0)
  })

  it('lê hostname pendente por Registry com argumentos fixos', async () => {
    const runProcess = vi.fn(async () => ({ ok: true, exitCode: 0, stdout: '    ComputerName    REG_SZ    cd54321s\r\n', stderr: '' }))
    expect(parseRegistryComputerName('ComputerName    REG_SZ    cd54321s')).toBe('CD54321S')
    expect(await readPendingHostname(runProcess)).toMatchObject({ ok: true, hostname: 'CD54321S' })
    expect(runProcess).toHaveBeenCalledWith('reg.exe', [
      'query',
      'HKLM\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName',
      '/v',
      'ComputerName',
    ])
  })

  it('aceita rename quando hostname pendente corresponde mesmo com hostname ativo antigo', async () => {
    const { controller, stateStore, runProcess, readPending } = createController({ current: 'AB12345S', pendingHostname: 'CD54321S' })
    const result = await controller.rename({ hostname: 'CD54321S' })
    expect(result).toMatchObject({ ok: true, pending: true, expectedHostname: 'CD54321S' })
    expect(runProcess).toHaveBeenCalledWith('wmic.exe', ['computersystem', 'where', "name='AB12345S'", 'call', 'rename', 'name=CD54321S'])
    expect(readPending).toHaveBeenCalledWith(runProcess)
    expect(stateStore.write).toHaveBeenCalledWith('CD54321S')
  })

  it('não executa WMIC sem privilégio administrativo', async () => {
    const { controller, runProcess, readPending } = createController({ elevated: false })
    expect(await controller.rename({ hostname: 'CD54321S' })).toMatchObject({ ok: false, elevated: false })
    expect(runProcess).not.toHaveBeenCalled()
    expect(readPending).not.toHaveBeenCalled()
  })

  it('falha quando hostname pendente diverge do esperado', async () => {
    const { controller, stateStore, logError } = createController({ pendingHostname: 'EF99999S' })
    expect(await controller.rename({ hostname: 'CD54321S' })).toMatchObject({ ok: false, returnValue: 0 })
    expect(logError).toHaveBeenCalledWith('[machine-preparation] Estado pendente inconsistente:', expect.objectContaining({ pendingHostnameMatches: false }))
    expect(stateStore.write).not.toHaveBeenCalled()
  })

  it('preserva exitCode não-zero e stderr no diagnóstico', async () => {
    const processResult = { ok: false, exitCode: 5, stdout: '', stderr: 'Access denied', error: 'Operação encerrada com código 5' }
    const { controller, stateStore, logError } = createController({ processResult })
    expect(await controller.rename({ hostname: 'CD54321S' })).toMatchObject({ ok: false, exitCode: 5, returnValue: null })
    expect(logError).toHaveBeenCalledWith('[machine-preparation] Falha no rename:', expect.objectContaining({ exitCode: 5, stderr: 'Access denied' }))
    expect(stateStore.write).not.toHaveBeenCalled()
  })

  it('preserva ReturnValue não-zero no diagnóstico', async () => {
    const { controller, stateStore, logError } = createController({ processResult: { ok: true, exitCode: 0, stdout: 'ReturnValue = 5;', stderr: '' } })
    expect(await controller.rename({ hostname: 'CD54321S' })).toMatchObject({ ok: false, exitCode: 0, returnValue: 5 })
    expect(logError).toHaveBeenCalledWith('[machine-preparation] Falha no rename:', expect.objectContaining({ returnValue: 5 }))
    expect(stateStore.write).not.toHaveBeenCalled()
  })

  it('não aceita exitCode zero sem ReturnValue', async () => {
    const { controller, stateStore } = createController({ processResult: { ok: true, exitCode: 0, stdout: 'Method execution successful.', stderr: '' } })
    expect(await controller.rename({ hostname: 'CD54321S' })).toMatchObject({ ok: false, returnValue: null })
    expect(stateStore.write).not.toHaveBeenCalled()
  })

  it('bloqueia hostname inválido antes da execução', async () => {
    const { controller, runProcess } = createController()
    expect((await controller.rename({ hostname: 'INVALIDO' })).ok).toBe(false)
    expect(runProcess).not.toHaveBeenCalled()
  })

  it('confirma estado pendente quando hostname esperado está ativo', async () => {
    const pending = { pending: true, expectedHostname: 'CD54321S', reason: 'hostname_change' }
    const { controller, stateStore } = createController({ current: 'cd54321s', pending })
    const result = await controller.status()
    expect(result).toMatchObject({ resumed: true, blocked: false, pending: false })
    expect(stateStore.clear).toHaveBeenCalled()
  })

  it('mantém bloqueio quando hostname ativo é diferente', async () => {
    const pending = { pending: true, expectedHostname: 'CD54321S', reason: 'hostname_change' }
    const { controller, stateStore } = createController({ current: 'AB12345S', pending })
    expect(await controller.canContinue()).toMatchObject({ ok: false, blocked: true })
    expect(stateStore.clear).not.toHaveBeenCalled()
  })

  it('bloqueia continuação de Preparar Máquina com reboot pendente', async () => {
    const pending = { pending: true, expectedHostname: 'CD54321S', reason: 'hostname_change' }
    const { controller } = createController({ pending })
    expect((await controller.canContinue()).ok).toBe(false)
  })

  it('executa reboot somente por intenção fixa com pendência', async () => {
    const pending = { pending: true, expectedHostname: 'CD54321S', reason: 'hostname_change' }
    const { controller, runProcess } = createController({ pending })
    expect(await controller.restart({})).toMatchObject({ ok: true })
    expect(runProcess).toHaveBeenCalledWith('shutdown.exe', ['/r', '/t', '0'])
  })
})

describe('machine preparation IPC payloads', () => {
  it('rejeita payload inválido', async () => {
    const { controller, runProcess } = createController()
    expect((await controller.rename(null)).ok).toBe(false)
    expect(runProcess).not.toHaveBeenCalled()
  })

  it('rejeita payload com campos extras', async () => {
    const { controller, runProcess } = createController()
    expect((await controller.rename({ hostname: 'CD54321S', command: 'calc.exe' })).ok).toBe(false)
    expect(runProcess).not.toHaveBeenCalled()
  })

  it('valida envelope vazio estrito para reboot', () => {
    expect(validateStrictPayload({}, [])).toBe(true)
    expect(validateStrictPayload({ force: true }, [])).toBe(false)
  })
})
