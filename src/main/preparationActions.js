const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { runProcessTracked } = require('./processRunner')

const ROBOCOPY_SUCCESS_CODES = [0, 1, 2, 3, 4, 5, 6, 7]

function ensureAbsolutePath(target, field) {
  if (typeof target !== 'string' || !target.trim()) throw new Error(`${field} não informado`)
  if (!path.isAbsolute(target) && !target.startsWith('\\\\')) throw new Error(`${field} deve ser absoluto`)
  return path.normalize(target)
}

function isPathInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child))
  return relative === '' || Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

function validateCleanupPath(target, allowedRoots = []) {
  const normalized = ensureAbsolutePath(target, 'path')
  const parsed = path.parse(normalized)
  if (normalized === parsed.root) throw new Error('Raiz de drive não pode ser removida')
  const uncParts = normalized.startsWith('\\\\') ? normalized.slice(2).split('\\').filter(Boolean) : []
  if (uncParts.length <= 2 && uncParts.length > 0) throw new Error('Raiz de compartilhamento não pode ser removida')
  const critical = [process.env.SystemRoot, process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)
  if (critical.some(root => isPathInside(normalized, root) || isPathInside(root, normalized))) throw new Error('Diretório crítico não pode ser removido')
  if (!allowedRoots.some(root => path.normalize(root) === normalized)) throw new Error('Destino fora da fronteira de staging')
  return normalized
}

function validateRecursiveCopy(source, destination) {
  if (path.normalize(source) === path.normalize(destination)) throw new Error('Source e destination não podem ser iguais')
  if (isPathInside(source, destination)) throw new Error('Destination não pode estar dentro do source')
}

function parsePowerScheme(output) {
  const match = String(output || '').match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return match?.[1] || null
}

function createPreparationActions(dependencies = {}) {
  const fileSystem = dependencies.fileSystem || fs
  const runTracked = dependencies.runTracked || runProcessTracked
  const runSync = dependencies.runSync || ((executable, args) => execFileSync(executable, args, { encoding: 'utf8', windowsHide: true }))
  let savedPowerScheme = null
  let temporaryPowerScheme = null

  const actions = {
    async 'sync-time'(ctx) {
      return runTracked(ctx.event, ctx.runId, 'w32tm.exe', ['/resync'], { successCodes: [0], prefix: '[Horário] ' })
    },

    async 'save-power-settings'() {
      const output = runSync('powercfg.exe', ['/getactivescheme'])
      savedPowerScheme = parsePowerScheme(output)
      if (!savedPowerScheme) return { ok: false, code: 1, error: 'Plano de energia ativo não identificado' }
      const duplicate = runSync('powercfg.exe', ['/duplicatescheme', savedPowerScheme])
      temporaryPowerScheme = parsePowerScheme(duplicate)
      if (!temporaryPowerScheme) return { ok: false, code: 1, error: 'Plano temporário não foi criado' }
      runSync('powercfg.exe', ['/setactive', temporaryPowerScheme])
      return { ok: true, code: 0 }
    },

    async 'disable-sleep-temporarily'(ctx) {
      if (!savedPowerScheme || !temporaryPowerScheme) return { ok: false, code: 1, error: 'Plano de energia não foi salvo' }
      const ac = await runTracked(ctx.event, ctx.runId, 'powercfg.exe', ['/change', 'standby-timeout-ac', '0'], { successCodes: [0], prefix: '[Energia] ' })
      if (!ac.ok) return ac
      return runTracked(ctx.event, ctx.runId, 'powercfg.exe', ['/change', 'standby-timeout-dc', '0'], { successCodes: [0], prefix: '[Energia] ' })
    },

    async 'restore-power-settings'(ctx) {
      if (!savedPowerScheme) return { ok: false, code: 1, error: 'Plano original não foi salvo' }
      const restored = await runTracked(ctx.event, ctx.runId, 'powercfg.exe', ['/setactive', savedPowerScheme], { successCodes: [0], prefix: '[Energia] ' })
      if (restored.ok && temporaryPowerScheme) {
        const removed = await runTracked(ctx.event, ctx.runId, 'powercfg.exe', ['/delete', temporaryPowerScheme], { successCodes: [0], prefix: '[Energia] ' })
        if (!removed.ok) return removed
      }
      savedPowerScheme = null
      temporaryPowerScheme = null
      return restored
    },

    async 'ensure-directory'(ctx) {
      const target = ensureAbsolutePath(ctx.step.path, 'path')
      fileSystem.mkdirSync(target, { recursive: true })
      return { ok: true, code: 0 }
    },

    async 'remove-directory'(ctx) {
      const target = validateCleanupPath(ctx.step.path, ctx.allowedCleanupRoots || [])
      fileSystem.rmSync(target, { recursive: true, force: true })
      return { ok: true, code: 0 }
    },

    async 'copy-file'(ctx) {
      const source = ensureAbsolutePath(ctx.step.source, 'source')
      const destination = ensureAbsolutePath(ctx.step.destination, 'destination')
      if (!fileSystem.existsSync(source) || !fileSystem.statSync(source).isFile()) return { ok: false, code: 2, error: 'Arquivo de origem não encontrado' }
      fileSystem.mkdirSync(path.dirname(destination), { recursive: true })
      fileSystem.copyFileSync(source, destination)
      return { ok: true, code: 0 }
    },

    async 'copy-directory'(ctx) {
      const source = ensureAbsolutePath(ctx.step.source, 'source')
      const destination = ensureAbsolutePath(ctx.step.destination, 'destination')
      if (!fileSystem.existsSync(source) || !fileSystem.statSync(source).isDirectory()) return { ok: false, code: 2, error: 'Diretório de origem não encontrado' }
      validateRecursiveCopy(source, destination)
      fileSystem.cpSync(source, destination, { recursive: true, force: true })
      return { ok: true, code: 0 }
    },

    async robocopy(ctx) {
      const source = ensureAbsolutePath(ctx.step.source, 'source')
      const destination = ensureAbsolutePath(ctx.step.destination, 'destination')
      if (!fileSystem.existsSync(source) || !fileSystem.statSync(source).isDirectory()) return { ok: false, code: 2, error: 'Diretório de origem não encontrado' }
      validateRecursiveCopy(source, destination)
      const extraArgs = String(ctx.step.args || '').trim().split(/\s+/).filter(Boolean)
      return runTracked(ctx.event, ctx.runId, 'robocopy.exe', [source, destination, ...extraArgs], { successCodes: ROBOCOPY_SUCCESS_CODES, timeoutMs: 0, prefix: '[Robocopy] ' })
    }
  }

  return {
    execute(step, context = {}) {
      const action = actions[step.action]
      if (!action) return Promise.resolve({ ok: false, code: 1, error: `Ação não suportada: ${step.action}` })
      return Promise.resolve().then(() => action({ ...context, step })).catch(err => ({ ok: false, code: 1, error: err.message }))
    },
    has(actionName) { return Boolean(actions[actionName]) },
  }
}

module.exports = { createPreparationActions, parsePowerScheme, ensureAbsolutePath, validateCleanupPath, validateRecursiveCopy, ROBOCOPY_SUCCESS_CODES }
