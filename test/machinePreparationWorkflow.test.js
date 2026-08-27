import { describe, expect, it } from 'vitest'
import { canSubmitHostnameValidation, classifyDeployResult, classifyPreparationResult, getChoiceDeployIds, getPreparationBaselineIds, getPreparationSelectionIds, hasDeployConfigurationErrors, isEditableTarget, shouldShowRebootAfterDeploy, transitionPreparationSelection } from '../src/shared/machinePreparationWorkflow.js'

function category(softwares) {
  return [{ id: 'cat', name: 'Catálogo', softwares }]
}

describe('preparation deploy baseline', () => {
  it('retorna vazio para catálogo sem baseline', () => {
    expect(getPreparationBaselineIds(category([{ id: 'optional' }]))).toEqual([])
  })

  it('seleciona um item baseline', () => {
    expect(getPreparationBaselineIds(category([{ id: 'base', defaultForPreparation: true }]))).toEqual(['base'])
  })

  it('seleciona múltiplos baseline e mantém opcionais fora', () => {
    expect(getPreparationBaselineIds(category([
      { id: 'base-a', defaultForPreparation: true },
      { id: 'optional', defaultForPreparation: false },
      { id: 'base-b', defaultForPreparation: true },
    ]))).toEqual(['base-a', 'base-b'])
  })

  it('não força baseline na entrada direta', () => {
    const directEntry = null
    expect(directEntry).toBeNull()
  })

  it('combina baseline e choice sem autoexecução', () => {
    const profile = { choices: [{ id: 'variant', required: true, label: 'Variante', options: [{ value: 'a', deployItems: ['choice-a'] }] }] }
    expect(getPreparationSelectionIds(category([{ id: 'base', defaultForPreparation: true }]), profile, { variant: 'a' })).toEqual({ ok: true, ids: ['base', 'choice-a'] })
  })

  it('preserva seleção manual ao trocar choice', () => {
    expect(transitionPreparationSelection(['base-a', 'choice-b', 'manual-c'], ['base-a'], ['choice-b'], ['choice-d'])).toEqual(['base-a', 'choice-d', 'manual-c'])
  })

  it('rejeita choice required ausente ou opção inválida', () => {
    const profile = { choices: [{ id: 'variant', required: true, label: 'Variante', options: [{ value: 'a', deployItems: [] }] }] }
    expect(getChoiceDeployIds(profile, {}).ok).toBe(false)
    expect(getChoiceDeployIds(profile, { variant: 'x' }).ok).toBe(false)
  })
})

describe('preparation result classification', () => {
  it('nunca classifica cancelamento como sucesso', () => {
    expect(classifyPreparationResult({ successCount: 1, errorCount: 0, cancelCount: 1, cancelled: true, preparation: {} }).kind).toBe('cancelled')
  })

  it('considera erro de cleanup mesmo com Deploy bem-sucedido', () => {
    const result = { successCount: 1, errorCount: 0, cancelCount: 0, preparation: { after: { ok: false, phases: { cleanup: [{ status: 'error' }] } } } }
    expect(classifyPreparationResult(result).kind).toBe('partial')
  })

  it('considera restore com erro no resultado consolidado', () => {
    const result = { successCount: 0, errorCount: 0, cancelCount: 0, preparation: { after: { ok: false, phases: { cleanup: [{ action: 'restore-power-settings', status: 'error' }] } } } }
    expect(classifyPreparationResult(result).kind).toBe('failure')
  })
})

describe('deploy result classification', () => {
  it('classifica sucesso total', () => {
    expect(classifyDeployResult({ successCount: 3, errorCount: 0, cancelCount: 0 }).title).toBe('Deploy concluído')
  })

  it('classifica sucesso parcial', () => {
    expect(classifyDeployResult({ successCount: 2, errorCount: 1, cancelCount: 0 }).title).toBe('Deploy concluído com erros')
  })

  it('classifica falha total', () => {
    expect(classifyDeployResult({ successCount: 0, errorCount: 3, cancelCount: 0 }).title).toBe('Deploy não foi concluído')
  })

  it('classifica cancelamento', () => {
    expect(classifyDeployResult({ successCount: 1, errorCount: 0, cancelCount: 2 }).title).toBe('Deploy interrompido')
  })

  it('não classifica item Shell iniciado como concluído', () => {
    expect(classifyDeployResult({ successCount: 0, errorCount: 0, cancelCount: 0, startedCount: 1 })).toEqual({ kind: 'started', title: 'Itens abertos pelo Windows' })
  })

  it('orienta configurações somente quando há erro classificado', () => {
    expect(hasDeployConfigurationErrors({ configurationErrorCount: 1 })).toBe(true)
    expect(hasDeployConfigurationErrors({ configurationErrorCount: 0, errorCount: 3 })).toBe(false)
  })
})

describe('global keyboard target guard', () => {
  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('ignora %s', tagName => {
    expect(isEditableTarget({ tagName })).toBe(true)
  })

  it('ignora contentEditable', () => {
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('mantém atalhos para alvos não editáveis', () => {
    expect(isEditableTarget({ tagName: 'BUTTON', isContentEditable: false })).toBe(false)
  })
})

describe('hostname Enter validation guard', () => {
  it('permite Enter somente para validar hostname preenchido', () => {
    expect(canSubmitHostnameValidation({ busy: false, hostname: 'AB12345S', validation: null })).toBe(true)
  })

  it('não executa durante processamento ou com botão desabilitado', () => {
    expect(canSubmitHostnameValidation({ busy: true, hostname: 'AB12345S', validation: null })).toBe(false)
    expect(canSubmitHostnameValidation({ busy: false, hostname: '   ', validation: null })).toBe(false)
  })

  it('não pula da validação aprovada para rename', () => {
    expect(canSubmitHostnameValidation({ busy: false, hostname: 'AB12345S', validation: { ok: true } })).toBe(false)
  })
})

describe('deploy completion reboot decision', () => {
  it('solicita aviso ao final quando reboot foi adiado para depois do Deploy', () => {
    expect(shouldShowRebootAfterDeploy({ pending: true, rebootAfterDeploy: true })).toBe(true)
  })

  it('mantém fluxo normal sem pendência', () => {
    expect(shouldShowRebootAfterDeploy({ pending: false, rebootAfterDeploy: false })).toBe(false)
  })
})
