// Resolve comandos conforme WMIC disponível — apenas CMD/reg/open (sem PowerShell)

import { WMIC_FALLBACKS } from './commands.js'

/** @returns {{ cmd: string, type: 'cmd' | 'open' | 'path' | 'uri' }} */
export function resolveWmicCommand(cmd, wmicAvailable) {
  if (wmicAvailable || !cmd) return { cmd, type: 'cmd' }

  const normalized = cmd.trim().toLowerCase()
  for (const [prefix, fallback] of Object.entries(WMIC_FALLBACKS)) {
    if (normalized.startsWith(prefix.toLowerCase())) {
      if (fallback.endsWith('|open') || fallback.endsWith('|path')) {
        const isPath = fallback.endsWith('|path')
        const fallbackCmd = fallback.slice(0, -5)
        return { cmd: fallbackCmd, type: isPath ? 'path' : (fallbackCmd.startsWith('ms-settings:') ? 'uri' : 'open') }
      }
      return { cmd: fallback, type: 'cmd' }
    }
  }
  return { cmd, type: 'cmd' }
}

/** Aplica fallbacks WMIC em todas as categorias (imutável). */
export function buildCategories(categories, wmicAvailable) {
  if (wmicAvailable) return categories

  return categories.map(cat => ({
    ...cat,
    cmds: cat.cmds.map(c => {
      if (c.type !== 'cmd') return c
      const resolved = resolveWmicCommand(c.cmd, false)
      if (resolved.cmd === c.cmd && resolved.type === 'cmd') return c
      return {
        ...c,
        cmd: resolved.cmd,
        type: resolved.type,
        desc: c.desc + (resolved.type === 'open' || resolved.type === 'path' || resolved.type === 'uri' ? ' (sem WMIC)' : ' (cmd alternativo)'),
      }
    }),
  }))
}
