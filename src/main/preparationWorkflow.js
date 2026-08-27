const PHASES_BEFORE_DEPLOY = ['preDeploy', 'staging']
const PHASES_AFTER_DEPLOY = ['postDeploy']

function createStepState(step) {
  return { id: step.id || null, action: step.action || step.itemId, status: 'pending', blocking: step.blocking !== false, error: null }
}

function createPreparationWorkflow({ actions, runDeployItemRef }) {
  let cancelled = false
  let blockedBeforeDeploy = false

  async function executeStep(step, context) {
    if (cancelled && !context.ignoreCancellation) return { ok: false, cancelled: true }
    if (step.type === 'action') return actions.execute(step, context)
    if (step.type === 'deploy-item-ref') return runDeployItemRef(step.itemId, context)
    return { ok: false, code: 1, error: 'Tipo de passo não suportado' }
  }

  async function runPhase(name, steps, context, states, options = {}) {
    const phaseStates = (steps || []).map(createStepState)
    states[name] = phaseStates
    for (let index = 0; index < (steps || []).length; index++) {
      const step = steps[index]
      const state = phaseStates[index]
      if (options.shouldRun && !options.shouldRun(step)) {
        state.status = 'skipped'
        continue
      }
      if (cancelled && !options.ignoreCancellation) {
        state.status = 'cancelled'
        for (let rest = index + 1; rest < phaseStates.length; rest++) phaseStates[rest].status = 'skipped'
        return { ok: false, cancelled: true }
      }
      state.status = 'running'
      context.onProgress?.({ phase: name, index, state: { ...state } })
      const result = await executeStep(step, { ...context, ignoreCancellation: options.ignoreCancellation })
      if (result.cancelled || cancelled && !options.ignoreCancellation) {
        state.status = 'cancelled'
        return { ok: false, cancelled: true }
      }
      if (result.ok) {
        state.status = 'success'
      } else {
        state.status = 'error'
        state.error = result.error || `Código ${result.code || 1}`
        if (step.blocking !== false) return { ok: false, blocking: true, error: state.error }
      }
      context.onProgress?.({ phase: name, index, state: { ...state } })
    }
    return { ok: true }
  }

  async function runBeforeDeploy(profile, context = {}) {
    cancelled = false
    blockedBeforeDeploy = false
    const phases = {}
    let result = { ok: true }
    for (const phase of PHASES_BEFORE_DEPLOY) {
      result = await runPhase(phase, profile?.[phase], context, phases)
      if (!result.ok) break
    }
    blockedBeforeDeploy = !result.ok
    return { ...result, phases }
  }

  async function runAfterDeploy(profile, deployResult, context = {}) {
    const phases = {}
    const allowedCleanupRoots = (profile?.staging || []).filter(step => ['copy-directory', 'robocopy', 'ensure-directory'].includes(step.action)).map(step => step.destination || step.path).filter(Boolean)
    const cleanupContext = { ...context, runId: `${context.runId}:cleanup`, deployResult, allowedCleanupRoots }
    let result = cancelled ? { ok: false, cancelled: true } : blockedBeforeDeploy ? { ok: false, blocking: true } : { ok: true }
    try {
      for (const phase of PHASES_AFTER_DEPLOY) {
        if (cancelled || blockedBeforeDeploy) break
        result = await runPhase(phase, profile?.[phase], { ...context, deployResult }, phases)
        if (!result.ok) break
      }
    } finally {
      const cleanup = await runPhase('cleanup', profile?.cleanup, cleanupContext, phases, {
        ignoreCancellation: true,
        shouldRun: step => !cancelled || step.action === 'restore-power-settings',
      })
      if (!cleanup.ok && result.ok) result = cleanup
    }
    return { ...result, phases }
  }

  return {
    runBeforeDeploy,
    runAfterDeploy,
    cancel() { cancelled = true },
    isCancelled() { return cancelled },
  }
}

function validateStartPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (Object.keys(payload).some(key => !['runId'].includes(key))) return false
  return typeof payload.runId === 'string' && Boolean(payload.runId.trim())
}

function validateFinishPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  if (Object.keys(payload).some(key => !['runId', 'deployResult'].includes(key))) return false
  if (typeof payload.runId !== 'string' || !payload.runId.trim()) return false
  const result = payload.deployResult
  if (!result || typeof result !== 'object' || Array.isArray(result)) return false
  const counters = ['successCount', 'errorCount', 'cancelCount', 'startedCount', 'totalCount', 'configurationErrorCount']
  const allowed = [...counters, 'cancelled']
  if (!Object.keys(result).every(key => allowed.includes(key))) return false
  if (counters.some(key => !Number.isInteger(result[key]) || result[key] < 0)) return false
  return typeof result.cancelled === 'boolean'
}

module.exports = { createPreparationWorkflow, createStepState, validateStartPayload, validateFinishPayload, PHASES_BEFORE_DEPLOY, PHASES_AFTER_DEPLOY }
