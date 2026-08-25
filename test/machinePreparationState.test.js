import { describe, expect, it } from 'vitest'
import state from '../src/main/machinePreparationState.js'

const { createPreparationStateStore, validatePendingState } = state

function createMemoryFs(initial) {
  const files = new Map(initial ? [['state.json', initial]] : [])
  return {
    existsSync: path => files.has(path),
    readFileSync: path => files.get(path),
    mkdirSync: () => {},
    writeFileSync: (path, content) => files.set(path, content),
    renameSync: (from, to) => { files.set(to, files.get(from)); files.delete(from) },
    unlinkSync: path => files.delete(path),
  }
}

describe('machine preparation state', () => {
  it('persiste somente o estado mínimo permitido', () => {
    const fileSystem = createMemoryFs()
    const store = createPreparationStateStore('state.json', fileSystem)
    expect(store.write('AB12345S')).toEqual({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change', rebootAfterDeploy: false })
    expect(store.read()).toEqual({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change', rebootAfterDeploy: false })
  })

  it('lê estado legado da TASK 08 como reboot ainda não adiado', () => {
    expect(validatePendingState({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change' })).toEqual({
      pending: true,
      expectedHostname: 'AB12345S',
      reason: 'hostname_change',
      rebootAfterDeploy: false,
    })
  })

  it('Reiniciar depois persiste rebootAfterDeploy', () => {
    const store = createPreparationStateStore('state.json', createMemoryFs())
    store.write('AB12345S')
    expect(store.deferUntilAfterDeploy()).toMatchObject({ pending: true, rebootAfterDeploy: true, expectedHostname: 'AB12345S' })
    expect(store.read().rebootAfterDeploy).toBe(true)
  })

  it('fechar e reabrir mantém pendência adiada', () => {
    const fileSystem = createMemoryFs()
    createPreparationStateStore('state.json', fileSystem).write('AB12345S')
    createPreparationStateStore('state.json', fileSystem).deferUntilAfterDeploy()
    expect(createPreparationStateStore('state.json', fileSystem).read()).toMatchObject({ pending: true, rebootAfterDeploy: true })
  })

  it('rejeita campos extras no estado persistido', () => {
    expect(validatePendingState({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change', token: 'x' })).toBeNull()
  })

  it('mantém bloqueio seguro quando o arquivo está corrompido', () => {
    const store = createPreparationStateStore('state.json', createMemoryFs('{'))
    expect(store.read()).toEqual({ pending: true, invalid: true, reason: 'hostname_change' })
  })

  it('limpa o estado pendente', () => {
    const fileSystem = createMemoryFs()
    const store = createPreparationStateStore('state.json', fileSystem)
    store.write('AB12345S')
    store.clear()
    expect(store.read()).toBeNull()
  })
})
