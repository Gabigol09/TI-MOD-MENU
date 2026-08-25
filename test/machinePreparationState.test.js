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
    expect(store.write('AB12345S')).toEqual({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change' })
    expect(store.read()).toEqual({ pending: true, expectedHostname: 'AB12345S', reason: 'hostname_change' })
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
