import { describe, expect, it } from 'vitest'
import runtimeModule from '../src/main/preparationRuntime.js'
import validatorModule from '../src/main/configValidator.js'
import workflowModule from '../src/main/preparationWorkflow.js'

const { createPreparationRuntime } = runtimeModule
const { validateConfig, toValidationResponse } = validatorModule
const { createPreparationWorkflow } = workflowModule

function response(config) {
  return toValidationResponse(validateConfig(config))
}

function deployResult() {
  return { successCount: 0, errorCount: 0, cancelCount: 0, startedCount: 0, totalCount: 0, configurationErrorCount: 0, cancelled: false }
}

function validConfig() {
  return {
    deploy: { categories: [{ id: 'cat', name: 'Cat', softwares: [{ id: 'soft-real', name: 'App', path: 'C:\\app.exe', type: 'executable' }] }] },
    preparationProfile: {
      enabled: true,
      preDeploy: [{ id: 'save', type: 'action', action: 'save-power-settings' }],
      staging: [],
      choices: [],
      postDeploy: [{ id: 'post', type: 'deploy-item-ref', itemId: 'soft-real' }],
      cleanup: [{ id: 'restore', type: 'action', action: 'restore-power-settings' }],
    },
  }
}

function createHarness(initialConfig = validConfig(), results = {}) {
  let currentConfig = initialConfig
  let loadError = null
  let validationError = null
  const calls = []
  let runtime
  const workflow = createPreparationWorkflow({
    actions: { execute: async (step, context) => {
      calls.push(`${step.action}:${context.runId}`)
      const result = results[step.action]
      if (result instanceof Error) throw result
      return result || { ok: true }
    } },
    runDeployItemRef: async (itemId, context) => {
      const item = runtime.getDeployCategories(context.runId).flatMap(category => category.softwares || []).find(software => software.id === itemId)
      calls.push(`ref:${item?.name || 'missing'}:${context.runId}`)
      const result = results[itemId]
      if (result instanceof Error) throw result
      return result || (item ? { ok: true } : { ok: false, error: 'missing' })
    },
  })
  runtime = createPreparationRuntime({
    loadConfig: () => { if (loadError) throw loadError; return currentConfig },
    validateConfig: config => { if (validationError) throw validationError; return response(config) },
    workflow,
  })
  return {
    runtime,
    workflow,
    calls,
    setConfig: config => { currentConfig = config },
    setLoadError: error => { loadError = error },
    setValidationError: error => { validationError = error },
  }
}

describe('preparation runtime', () => {
  it('bloqueia start com broken reference sem criar snapshot', async () => {
    const config = validConfig()
    config.preparationProfile.postDeploy[0].itemId = 'soft-inexistente'
    const { runtime, calls } = createHarness(config)
    const result = await runtime.start({}, { runId: 'run-1' })
    expect(result.ok).toBe(false)
    expect(runtime.activeRunCount()).toBe(0)
    expect(calls).toEqual([])
  })

  it('rejeita segundo run e runId duplicado enquanto há run ativo', async () => {
    const { runtime } = createHarness()
    expect((await runtime.start({}, { runId: 'run-a' })).ok).toBe(true)
    expect((await runtime.start({}, { runId: 'run-b' }))).toMatchObject({ ok: false })
    expect((await runtime.start({}, { runId: 'run-a' }))).toMatchObject({ ok: false })
    expect(runtime.has('run-a')).toBe(true)
    expect(runtime.has('run-b')).toBe(false)
    expect(runtime.activeRunCount()).toBe(1)
  })

  it('pula postDeploy explicitamente após config quebrar, retorna incompleto, restaura e descarta', async () => {
    const { runtime, calls, setConfig } = createHarness()
    await runtime.start({}, { runId: 'run-2' })
    const broken = validConfig()
    broken.preparationProfile.postDeploy[0].itemId = 'soft-inexistente'
    setConfig(broken)
    const result = await runtime.finish({}, { runId: 'run-2', deployResult: deployResult() })
    expect(result).toMatchObject({ ok: false, incomplete: true })
    expect(result.phases.postDeploy).toEqual([expect.objectContaining({ status: 'skipped' })])
    expect(calls).toEqual(['save-power-settings:run-2', 'restore-power-settings:run-2:cleanup'])
    expect(runtime.activeRunCount()).toBe(0)
  })

  it('erro de load no finish pula postDeploy, restaura e descarta', async () => {
    const { runtime, calls, setLoadError } = createHarness()
    await runtime.start({}, { runId: 'run-load' })
    setLoadError(new Error('falha de leitura'))
    const result = await runtime.finish({}, { runId: 'run-load', deployResult: deployResult() })
    expect(result).toMatchObject({ ok: false, incomplete: true })
    expect(result.phases.postDeploy[0].status).toBe('skipped')
    expect(calls).toContain('restore-power-settings:run-load:cleanup')
    expect(runtime.activeRunCount()).toBe(0)
  })

  it('erro de validation no finish pula postDeploy, restaura e descarta', async () => {
    const { runtime, calls, setValidationError } = createHarness()
    await runtime.start({}, { runId: 'run-validation' })
    setValidationError(new Error('falha de validação'))
    const result = await runtime.finish({}, { runId: 'run-validation', deployResult: deployResult() })
    expect(result).toMatchObject({ ok: false, incomplete: true })
    expect(calls).toContain('restore-power-settings:run-validation:cleanup')
    expect(runtime.activeRunCount()).toBe(0)
  })

  it('exceção em runBeforeDeploy tenta cleanup e remove snapshot', async () => {
    const calls = []
    const snapshotProfile = validConfig().preparationProfile
    const workflow = {
      runBeforeDeploy: async () => { throw new Error('falha inesperada no preDeploy') },
      runAfterDeploy: async (profile, _deployResult, context) => {
        calls.push(`${profile.cleanup[0].action}:${context.runId}:cleanup`)
        return { ok: false, incomplete: true, phases: { cleanup: [{ status: 'success' }] } }
      },
    }
    const runtime = createPreparationRuntime({ loadConfig: validConfig, validateConfig: response, workflow })
    const result = await runtime.start({}, { runId: 'run-start-error' })
    expect(result).toMatchObject({ ok: false, startFailed: true })
    expect(calls).toEqual(['restore-power-settings:run-start-error:cleanup'])
    expect(runtime.activeRunCount()).toBe(0)
    expect(snapshotProfile.cleanup[0].action).toBe('restore-power-settings')
  })

  it('mantém catálogo do snapshot durante o run', async () => {
    const config = validConfig()
    config.preparationProfile.preDeploy = []
    const { runtime, calls, setConfig } = createHarness(config)
    await runtime.start({}, { runId: 'run-3' })
    const changed = validConfig()
    changed.deploy.categories[0].softwares[0].name = 'Alterado externamente'
    setConfig(changed)
    expect((await runtime.finish({}, { runId: 'run-3', deployResult: deployResult() })).ok).toBe(true)
    expect(calls).toContain('ref:App:run-3')
    expect(runtime.activeRunCount()).toBe(0)
  })

  it('postDeploy e cleanup com falha permanecem representados', async () => {
    const { runtime } = createHarness(validConfig(), {
      'soft-real': { ok: false, error: 'falha no postDeploy' },
      'restore-power-settings': { ok: false, error: 'falha no restore' },
    })
    await runtime.start({}, { runId: 'run-errors' })
    const result = await runtime.finish({}, { runId: 'run-errors', deployResult: deployResult() })
    expect(result).toMatchObject({ ok: false, cleanupFailed: true, error: 'falha no postDeploy', cleanupError: 'falha no restore' })
    expect(result.phases.postDeploy[0]).toMatchObject({ status: 'error', error: 'falha no postDeploy' })
    expect(result.phases.cleanup[0]).toMatchObject({ status: 'error', error: 'falha no restore' })
    expect(runtime.activeRunCount()).toBe(0)
  })

  it('cancelamento preserva restore no namespace cleanup e descarta snapshot', async () => {
    const { runtime, workflow, calls } = createHarness()
    await runtime.start({}, { runId: 'run-4' })
    workflow.cancel()
    const result = await runtime.finish({}, { runId: 'run-4', deployResult: { ...deployResult(), cancelled: true } })
    expect(result.cancelled).toBe(true)
    expect(calls).toContain('restore-power-settings:run-4:cleanup')
    expect(runtime.activeRunCount()).toBe(0)
  })
})
