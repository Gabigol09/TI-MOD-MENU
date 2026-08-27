import { describe, expect, it } from 'vitest'
import workflowModule from '../src/main/preparationWorkflow.js'

const { createPreparationWorkflow, validateStartPayload, validateFinishPayload } = workflowModule

function createHarness(results = {}) {
  const calls = []
  const actions = {
    execute: async step => {
      calls.push(step.action)
      return results[step.action] || { ok: true, code: 0 }
    }
  }
  const workflow = createPreparationWorkflow({
    actions,
    runDeployItemRef: async itemId => { calls.push(`ref:${itemId}`); return results[itemId] || { ok: true, code: 0 } },
  })
  return { workflow, calls }
}

describe('preparation workflow', () => {
  it('executa preDeploy e staging em ordem', async () => {
    const { workflow, calls } = createHarness()
    const result = await workflow.runBeforeDeploy({
      preDeploy: [{ type: 'action', action: 'sync-time' }],
      staging: [{ type: 'action', action: 'copy-file' }],
    })
    expect(result.ok).toBe(true)
    expect(calls).toEqual(['sync-time', 'copy-file'])
  })

  it('blocking interrompe e marca etapas seguintes como não executadas', async () => {
    const { workflow, calls } = createHarness({ broken: { ok: false, error: 'falha' } })
    const result = await workflow.runBeforeDeploy({
      preDeploy: [{ type: 'action', action: 'broken', blocking: true }, { type: 'action', action: 'later' }],
      staging: [{ type: 'action', action: 'copy-file' }],
    })
    expect(result).toMatchObject({ ok: false, blocking: true })
    expect(calls).toEqual(['broken'])
  })

  it('blocking pré-Deploy impede pós-Deploy mas executa cleanup obrigatório', async () => {
    const { workflow, calls } = createHarness({ broken: { ok: false, error: 'falha' } })
    await workflow.runBeforeDeploy({ preDeploy: [{ type: 'action', action: 'broken', blocking: true }] })
    const result = await workflow.runAfterDeploy({
      postDeploy: [{ type: 'action', action: 'post' }],
      cleanup: [{ type: 'action', action: 'restore-power-settings' }],
    }, {})
    expect(result.ok).toBe(false)
    expect(calls).toEqual(['broken', 'restore-power-settings'])
  })

  it('nonBlocking registra erro e continua', async () => {
    const { workflow, calls } = createHarness({ broken: { ok: false, error: 'falha' } })
    const result = await workflow.runBeforeDeploy({ preDeploy: [
      { type: 'action', action: 'broken', blocking: false },
      { type: 'action', action: 'later', blocking: true },
    ] })
    expect(result.ok).toBe(true)
    expect(result.phases.preDeploy[0].status).toBe('error')
    expect(calls).toEqual(['broken', 'later'])
  })

  it('executa cleanup em finally depois de erro no postDeploy', async () => {
    const { workflow, calls } = createHarness({ broken: { ok: false, error: 'falha' } })
    const result = await workflow.runAfterDeploy({
      postDeploy: [{ type: 'action', action: 'broken', blocking: true }],
      cleanup: [{ type: 'action', action: 'restore-power-settings', blocking: true }],
    }, { successCount: 1 })
    expect(result.ok).toBe(false)
    expect(calls).toEqual(['broken', 'restore-power-settings'])
    expect(result.phases.cleanup[0].status).toBe('success')
  })

  it('cancelamento não produz falso sucesso e ainda permite cleanup em finish', async () => {
    const { workflow, calls } = createHarness()
    workflow.cancel()
    const result = await workflow.runAfterDeploy({ cleanup: [
      { type: 'action', action: 'restore-power-settings' },
      { type: 'action', action: 'remove-directory' },
    ] }, { cancelled: true })
    expect(result.ok).toBe(false)
    expect(result.cancelled).toBe(true)
    expect(calls).toEqual(['restore-power-settings'])
    expect(result.phases.cleanup[1].status).toBe('skipped')
  })

  it('executa referência a SCRIPT pelo executor de Deploy injetado', async () => {
    const { workflow, calls } = createHarness()
    await workflow.runAfterDeploy({ postDeploy: [{ type: 'deploy-item-ref', itemId: 'script-config' }] }, {})
    expect(calls).toEqual(['ref:script-config'])
  })

  it('isola cleanup obrigatório do runId cancelado', async () => {
    const runIds = []
    const workflow = createPreparationWorkflow({
      actions: { execute: async (_step, context) => { runIds.push(context.runId); return { ok: true } } },
      runDeployItemRef: async () => ({ ok: true }),
    })
    workflow.cancel()
    const result = await workflow.runAfterDeploy({ cleanup: [{ type: 'action', action: 'restore-power-settings' }] }, { cancelled: true }, { runId: 'principal' })
    expect(result.cancelled).toBe(true)
    expect(runIds).toEqual(['principal:cleanup'])
  })

  it('valida payloads IPC estritamente', () => {
    const validResult = { successCount: 1, errorCount: 0, cancelCount: 0, startedCount: 0, totalCount: 1, configurationErrorCount: 0, cancelled: false }
    expect(validateStartPayload({ runId: '1' })).toBe(true)
    expect(validateStartPayload({ runId: '1', command: 'x' })).toBe(false)
    expect(validateFinishPayload({ runId: '1', deployResult: validResult })).toBe(true)
    expect(validateFinishPayload({ runId: '1', deployResult: { ...validResult, successCount: '1' } })).toBe(false)
    expect(validateFinishPayload({ runId: '1', deployResult: { ...validResult, errorCount: -1 } })).toBe(false)
    expect(validateFinishPayload({ runId: '1', deployResult: {}, path: 'C:\\x' })).toBe(false)
  })
})
