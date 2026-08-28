function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createPreparationRuntime({ loadConfig, validateConfig, workflow }) {
  let activeRun = null

  function validationFailure(err) {
    return { ok: false, error: err?.message || 'Falha ao validar a configuração atual.' }
  }

  async function cleanupAfterStartFailure(snapshot, event, runId, err) {
    const reason = err?.message || 'Falha inesperada antes do Deploy.'
    const result = await workflow.runAfterDeploy(snapshot.profile, {}, { event, runId, skipPostDeploy: true, skipReason: reason })
    return { ...result, ok: false, startFailed: true, error: reason }
  }

  async function start(event, payload) {
    if (activeRun) return { ok: false, error: 'Já existe um workflow de preparação em execução.' }
    let config
    let validation
    try {
      config = loadConfig()
      validation = validateConfig(config)
    } catch (err) {
      return validationFailure(err)
    }
    if (!validation.ok || validation.needsRepair) {
      return { ok: false, error: validation.error || 'O perfil contém referências inexistentes ao catálogo e não pode ser executado.' }
    }
    const profile = config?.preparationProfile
    if (!profile?.enabled) return { ok: true, skipped: true, phases: {} }
    const snapshot = clone({ profile, deployCategories: config.deploy?.categories || [] })
    activeRun = { runId: payload.runId, snapshot }
    try {
      return await workflow.runBeforeDeploy(snapshot.profile, { event, runId: payload.runId })
    } catch (err) {
      try {
        return await cleanupAfterStartFailure(snapshot, event, payload.runId, err)
      } finally {
        activeRun = null
      }
    }
  }

  async function finish(event, payload) {
    if (!activeRun || activeRun.runId !== payload.runId) return { ok: false, error: 'Workflow de preparação não iniciado para este runId.' }
    const { snapshot } = activeRun
    let skipPostDeploy = false
    let skipReason = null
    try {
      try {
        const currentValidation = validateConfig(loadConfig())
        skipPostDeploy = !currentValidation.ok || currentValidation.needsRepair
        if (skipPostDeploy) skipReason = currentValidation.error || 'Configuração alterada durante o workflow.'
      } catch (err) {
        skipPostDeploy = true
        skipReason = err.message || 'Falha ao validar a configuração atual.'
      }
      return await workflow.runAfterDeploy(snapshot.profile, payload.deployResult, { event, runId: payload.runId, skipPostDeploy, skipReason })
    } finally {
      activeRun = null
    }
  }

  function getDeployCategories(runId) {
    return activeRun?.runId === runId ? activeRun.snapshot.deployCategories : null
  }

  function discard(runId) {
    if (activeRun?.runId === runId) activeRun = null
  }

  return {
    start,
    finish,
    getDeployCategories,
    discard,
    has: runId => activeRun?.runId === runId,
    activeRunCount: () => activeRun ? 1 : 0,
  }
}

module.exports = { createPreparationRuntime }
