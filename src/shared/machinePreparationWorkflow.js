export function getPreparationBaselineIds(categories) {
  if (!Array.isArray(categories)) return []
  return categories.flatMap(category => Array.isArray(category?.softwares)
    ? category.softwares.filter(software => software?.defaultForPreparation === true).map(software => software.id)
    : [])
}

export function getChoiceDeployIds(profile, selections = {}) {
  const choices = Array.isArray(profile?.choices) ? profile.choices : []
  const ids = []
  for (const choice of choices) {
    const selected = selections[choice.id]
    if (!selected) {
      if (choice.required) return { ok: false, error: `Escolha obrigatória: ${choice.label}`, ids: [] }
      continue
    }
    const option = choice.options?.find(item => item.value === selected)
    if (!option) return { ok: false, error: `Opção inválida para ${choice.label}`, ids: [] }
    ids.push(...(option.deployItems || []))
  }
  return { ok: true, ids: [...new Set(ids)] }
}

export function getPreparationSelectionIds(categories, profile, selections = {}) {
  const choices = getChoiceDeployIds(profile, selections)
  if (!choices.ok) return choices
  return { ok: true, ids: [...new Set([...getPreparationBaselineIds(categories), ...choices.ids])] }
}

export function transitionPreparationSelection(currentIds, baselineIds, previousChoiceIds, nextChoiceIds) {
  const baseline = new Set(baselineIds)
  const previousChoice = new Set(previousChoiceIds)
  const manual = [...currentIds].filter(id => !baseline.has(id) && !previousChoice.has(id))
  return [...new Set([...baselineIds, ...nextChoiceIds, ...manual])]
}

export function getPreparationPhases(result) {
  return { ...(result?.preparation?.before?.phases || {}), ...(result?.preparation?.after?.phases || {}) }
}

export function classifyPreparationResult(result) {
  const phases = getPreparationPhases(result)
  const steps = Object.values(phases).flat()
  const cancelled = Boolean(result?.cancelled || Number(result?.cancelCount) > 0 || result?.preparation?.before?.cancelled || result?.preparation?.after?.cancelled || steps.some(step => step.status === 'cancelled'))
  if (cancelled) return { kind: 'cancelled', title: 'Preparação interrompida' }
  const phaseErrors = steps.filter(step => step.status === 'error').length
  const deployErrors = Number(result?.errorCount) || 0
  const successes = Number(result?.successCount) || 0
  if (phaseErrors > 0 || deployErrors > 0 || result?.preparation?.before?.ok === false || result?.preparation?.after?.ok === false) {
    return successes > 0 ? { kind: 'partial', title: 'Preparação concluída com ressalvas' } : { kind: 'failure', title: 'Preparação não concluída' }
  }
  return { kind: 'success', title: 'Preparação concluída' }
}

export function shouldShowRebootAfterDeploy(status) {
  return Boolean(status?.pending && status?.rebootAfterDeploy)
}

export function classifyDeployResult(result) {
  const successCount = Number(result?.successCount) || 0
  const errorCount = Number(result?.errorCount) || 0
  const cancelCount = Number(result?.cancelCount) || 0
  const startedCount = Number(result?.startedCount) || 0
  if (cancelCount > 0) return { kind: 'cancelled', title: 'Deploy interrompido' }
  if (startedCount > 0) return { kind: 'started', title: 'Itens abertos pelo Windows' }
  if (successCount > 0 && errorCount === 0) return { kind: 'success', title: 'Deploy concluído' }
  if (successCount > 0 && errorCount > 0) return { kind: 'partial', title: 'Deploy concluído com erros' }
  if (errorCount > 0) return { kind: 'failure', title: 'Deploy não foi concluído' }
  return { kind: 'empty', title: 'Deploy sem itens concluídos' }
}

export function hasDeployConfigurationErrors(result) {
  return Number(result?.configurationErrorCount) > 0
}

export function isEditableTarget(target) {
  const tagName = String(target?.tagName || '').toUpperCase()
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || target?.isContentEditable === true
}

export function canSubmitHostnameValidation({ busy, hostname, validation }) {
  return !busy && Boolean(String(hostname || '').trim()) && validation?.ok !== true
}
