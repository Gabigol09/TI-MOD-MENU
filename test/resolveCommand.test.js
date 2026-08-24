import { describe, expect, it } from 'vitest'
import { buildCategories, resolveWmicCommand } from '../src/shared/resolveCommand.js'

describe('resolveWmicCommand', () => {
  it('mantém o caminho principal quando WMIC está disponível', () => {
    expect(resolveWmicCommand('wmic bios get serialnumber', true)).toEqual({
      cmd: 'wmic bios get serialnumber',
      type: 'cmd',
    })
  })

  it('aplica fallback CMD determinístico quando WMIC está indisponível', () => {
    expect(resolveWmicCommand('WMIC BIOS GET SERIALNUMBER', false)).toEqual({
      cmd: 'systeminfo',
      type: 'cmd',
    })
  })

  it('converte fallback de caminho para o tipo correto', () => {
    expect(resolveWmicCommand('wmic path Win32_VideoController get Name', false)).toEqual({
      cmd: '%SystemRoot%\\System32\\dxdiag.exe',
      type: 'path',
    })
  })

  it('converte fallback ms-settings para URI', () => {
    expect(resolveWmicCommand('wmic desktopmonitor get Name', false)).toEqual({
      cmd: 'ms-settings:display',
      type: 'uri',
    })
  })

  it('mantém comando ao qual WMIC não se aplica', () => {
    expect(resolveWmicCommand('ipconfig /all', false)).toEqual({ cmd: 'ipconfig /all', type: 'cmd' })
  })
})

describe('buildCategories', () => {
  it('aplica fallback sem mutar as categorias originais', () => {
    const categories = [{ id: 'test', cmds: [
      { name: 'Serial', type: 'cmd', cmd: 'wmic bios get serialnumber', desc: 'serial' },
      { name: 'Rede', type: 'cmd', cmd: 'ipconfig /all', desc: 'rede' },
      { name: 'Arquivo', type: 'path', cmd: 'arquivo.cpl', desc: 'arquivo' },
    ] }]

    const result = buildCategories(categories, false)

    expect(result[0].cmds[0]).toMatchObject({ cmd: 'systeminfo', type: 'cmd', desc: 'serial (cmd alternativo)' })
    expect(result[0].cmds[1]).toBe(categories[0].cmds[1])
    expect(result[0].cmds[2]).toBe(categories[0].cmds[2])
    expect(categories[0].cmds[0].cmd).toBe('wmic bios get serialnumber')
  })
})
