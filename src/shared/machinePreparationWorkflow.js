export function getPreparationBaselineIds(categories) {
  if (!Array.isArray(categories)) return []
  return categories.flatMap(category => Array.isArray(category?.softwares)
    ? category.softwares.filter(software => software?.defaultForPreparation === true).map(software => software.id)
    : [])
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
