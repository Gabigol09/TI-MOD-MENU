import { describe, expect, it } from 'vitest'
import { resolveCommand, validateExecutionRequest, listRegistered } from '../src/main/commandRegistry.js'
import { CATEGORIES } from '../src/shared/commands.js'

describe('commandRegistry', () => {
  it('registra o subconjunto migrado esperado', () => {
    const registered = listRegistered()
    expect(registered).toContain('diagnostico.hostname')
    expect(registered).toContain('rede.ipconfig-all')
    expect(registered).toContain('rede.flush-dns')
    expect(registered).toContain('rede.list-mappings')
    expect(registered).toContain('diagnostico.systeminfo')
    expect(registered.length).toBe(5)
  })

  it('resolve commandId conhecido sem payload e retorna string literal determinística', () => {
    const result = resolveCommand('diagnostico.hostname')
    expect(result.ok).toBe(true)
    expect(result.commandId).toBe('diagnostico.hostname')
    expect(result.strategy).toBe('cmd')
    expect(result.cmd).toBe('hostname')
  })

  it('rejeita commandId desconhecido', () => {
    const result = resolveCommand('hacker.cmd')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('commandId desconhecido')
  })

  it('rejeita commandId inválido (null, undefined, number, object)', () => {
    expect(resolveCommand(null).ok).toBe(false)
    expect(resolveCommand(123).ok).toBe(false)
    expect(resolveCommand({}).ok).toBe(false)
    expect(resolveCommand('').ok).toBe(false)
  })

  it('rejeita payload para comandos migrados que não o preveem', () => {
    const result = resolveCommand('diagnostico.hostname', { arg: 'injetado' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('nao aceita payload')
  })

  it('aceita undefined, null ou objeto vazio em comandos sem payload', () => {
    expect(resolveCommand('diagnostico.hostname', undefined).ok).toBe(true)
    expect(resolveCommand('diagnostico.hostname', null).ok).toBe(true)
    expect(resolveCommand('diagnostico.hostname', {}).ok).toBe(true)
  })

  it('valida o envelope exato da requisição e rejeita campos extras', () => {
    expect(validateExecutionRequest(null).ok).toBe(false)
    expect(validateExecutionRequest('diagnostico.hostname').ok).toBe(false)

    expect(validateExecutionRequest({ commandId: 'diagnostico.hostname' }).ok).toBe(true)

    const extra = validateExecutionRequest({ commandId: 'diagnostico.hostname', extra: 1 })
    expect(extra.ok).toBe(false)
    expect(extra.error).toContain('campos inesperados')
  })

  it('preserva os comandos literais exatos para os IDs migrados do catálogo', () => {
    let migradosCount = 0
    CATEGORIES.forEach(cat => {
      cat.cmds.forEach(cmd => {
        if (cmd.commandId) {
          migradosCount++
          const resolved = resolveCommand(cmd.commandId)
          expect(resolved.ok).toBe(true)
          expect(resolved.cmd).toBe(cmd.cmd)
          expect(resolved.strategy).toBe('cmd')
        }
      })
    })
    expect(migradosCount).toBe(5)
  })
})
