import { describe, expect, it } from 'vitest'
import wmicCheck from '../src/main/wmicCheck.js'

const { isWmicProbeSuccessful, outputLooksBroken } = wmicCheck

describe('outputLooksBroken', () => {
  it('reconhece mensagens quebradas em português e inglês', () => {
    expect(outputLooksBroken('Verbo inválido')).toBe(true)
    expect(outputLooksBroken('Invalid verb')).toBe(true)
  })

  it('não marca saída normal como quebrada', () => {
    expect(outputLooksBroken('Name\r\nDispositivo')).toBe(false)
  })
})

describe('isWmicProbeSuccessful', () => {
  it('aceita saída funcional com coluna Name', () => {
    expect(isWmicProbeSuccessful(null, 'Name\r\nDispositivo de exemplo', '')).toBe(true)
  })

  it('rejeita erro de execução', () => {
    expect(isWmicProbeSuccessful(new Error('falha'), 'Name\r\nDispositivo', '')).toBe(false)
  })

  it('rejeita código de erro WMIC sem coluna Name', () => {
    expect(isWmicProbeSuccessful(null, '44210', '')).toBe(false)
  })

  it('rejeita marcador quebrado vindo do stderr', () => {
    expect(isWmicProbeSuccessful(null, '', 'not supported')).toBe(false)
  })
})
