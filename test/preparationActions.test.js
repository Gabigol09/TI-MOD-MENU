import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import actionsModule from '../src/main/preparationActions.js'

const { createPreparationActions, parsePowerScheme, validateCleanupPath, validateRecursiveCopy, ROBOCOPY_SUCCESS_CODES } = actionsModule

async function withTempDir(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-preparation-'))
  try { return await run(directory) } finally { fs.rmSync(directory, { recursive: true, force: true }) }
}

describe('preparation actions', () => {
  it('parseia GUID do plano de energia', () => {
    expect(parsePowerScheme('GUID do Esquema de Energia: 381b4222-f694-41f0-9685-ff5bb260df2e')).toBe('381b4222-f694-41f0-9685-ff5bb260df2e')
  })

  it('copia arquivo e diretório e remove staging', async () => withTempDir(async directory => {
    const sourceFile = path.join(directory, 'source.txt')
    const copiedFile = path.join(directory, 'out', 'copied.txt')
    fs.writeFileSync(sourceFile, 'ok')
    const sourceDir = path.join(directory, 'folder')
    const copiedDir = path.join(path.dirname(directory), `${path.basename(directory)}-folder-copy`)
    fs.mkdirSync(sourceDir)
    fs.writeFileSync(path.join(sourceDir, 'item.txt'), 'item')
    const actions = createPreparationActions()

    const res = await actions.execute({ action: 'copy-file', source: sourceFile, destination: copiedFile })
    expect(res.ok).toBe(true)
    expect(fs.readFileSync(copiedFile, 'utf8')).toBe('ok')
    expect((await actions.execute({ action: 'copy-directory', source: sourceDir, destination: copiedDir })).ok).toBe(true)
    expect(fs.existsSync(path.join(copiedDir, 'item.txt'))).toBe(true)
    expect((await actions.execute({ action: 'remove-directory', path: copiedDir }, { allowedCleanupRoots: [copiedDir] })).ok).toBe(true)
    expect(fs.existsSync(copiedDir)).toBe(false)
  }))

  it('falha quando source não existe ou path é relativo', async () => {
    const actions = createPreparationActions()
    expect((await actions.execute({ action: 'copy-file', source: 'relativo.txt', destination: 'C:\\Temp\\x' })).ok).toBe(false)
    expect((await actions.execute({ action: 'copy-directory', source: 'C:\\inexistente', destination: 'C:\\Temp\\x' })).ok).toBe(false)
  })

  it('usa semântica de sucesso 0 a 7 do robocopy', async () => withTempDir(async directory => {
    const calls = []
    const actions = createPreparationActions({ runTracked: async (...args) => { calls.push(args); return { ok: true, code: 3 } } })
    const result = await actions.execute({ action: 'robocopy', source: directory, destination: path.join(path.dirname(directory), `${path.basename(directory)}-dest`), args: '/E' }, { runId: '1' })
    expect(result).toMatchObject({ ok: true, code: 3 })
    expect(calls[0][4].successCodes).toEqual(ROBOCOPY_SUCCESS_CODES)
    expect(ROBOCOPY_SUCCESS_CODES).not.toContain(8)
  }))

  it('salva, aplica e restaura energia com processo rastreado', async () => {
    const calls = []
    const syncCalls = []
    const original = '381b4222-f694-41f0-9685-ff5bb260df2e'
    const temporary = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const actions = createPreparationActions({
      runSync: (executable, args) => {
        syncCalls.push([executable, args])
        return args[0] === '/getactivescheme' ? `GUID: ${original}` : `GUID: ${temporary}`
      },
      runTracked: async (_event, _id, executable, args) => { calls.push([executable, args]); return { ok: true, code: 0 } },
    })
    expect((await actions.execute({ action: 'save-power-settings' })).ok).toBe(true)
    expect((await actions.execute({ action: 'disable-sleep-temporarily' }, { runId: '1' })).ok).toBe(true)
    expect((await actions.execute({ action: 'restore-power-settings' }, { runId: '1' })).ok).toBe(true)
    expect(syncCalls).toContainEqual(['powercfg.exe', ['/setactive', temporary]])
    expect(calls).toContainEqual(['powercfg.exe', ['/setactive', original]])
    expect(calls.at(-1)).toEqual(['powercfg.exe', ['/delete', temporary]])
  })

  it('bloqueia roots, paths críticos e destinos fora do staging', () => withTempDir(async directory => {
    expect(() => validateCleanupPath(path.parse(directory).root, [path.parse(directory).root])).toThrow()
    expect(() => validateCleanupPath('\\\\servidor\\share', ['\\\\servidor\\share'])).toThrow()
    expect(() => validateCleanupPath(path.join(directory, 'outside'), [path.join(directory, 'allowed')])).toThrow()
    expect(validateCleanupPath(path.join(directory, 'allowed'), [path.join(directory, 'allowed')])).toBe(path.join(directory, 'allowed'))
  }))

  it('bloqueia cópia recursiva para o mesmo destino ou descendente do source', () => withTempDir(async directory => {
    expect(() => validateRecursiveCopy(directory, directory)).toThrow()
    expect(() => validateRecursiveCopy(directory, path.join(directory, 'child'))).toThrow()
  }))

  it('propaga falhas intermediárias de energia e permite restore posterior', async () => {
    const original = '381b4222-f694-41f0-9685-ff5bb260df2e'
    const temporary = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    let syncIndex = 0
    const actions = createPreparationActions({
      runSync: (_executable, args) => {
        syncIndex++
        if (syncIndex === 1) return `GUID: ${original}`
        if (syncIndex === 2) return `GUID: ${temporary}`
        if (args[0] === '/setactive') throw new Error('setactive temporário falhou')
        return ''
      },
      runTracked: async () => ({ ok: true, code: 0 }),
    })
    expect((await actions.execute({ action: 'save-power-settings' })).ok).toBe(false)
    expect((await actions.execute({ action: 'restore-power-settings' }, { runId: 'restore' })).ok).toBe(true)
  })

  it('reporta falha ao restaurar ou excluir plano temporário', async () => {
    const original = '381b4222-f694-41f0-9685-ff5bb260df2e'
    const temporary = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const outputs = [`GUID: ${original}`, `GUID: ${temporary}`, '']
    const actions = createPreparationActions({
      runSync: () => outputs.shift(),
      runTracked: async (_event, _id, _exe, args) => args[0] === '/delete' ? { ok: false, code: 1 } : { ok: true, code: 0 },
    })
    expect((await actions.execute({ action: 'save-power-settings' })).ok).toBe(true)
    expect((await actions.execute({ action: 'restore-power-settings' }, { runId: 'restore' })).ok).toBe(false)
  })

  it('rejeita action arbitrária', async () => {
    expect(await createPreparationActions().execute({ action: 'execute-any-command' })).toMatchObject({ ok: false })
  })
})
