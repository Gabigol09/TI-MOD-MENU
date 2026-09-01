export function isSharedConfigReadOnly(status) {
  return status?.state === 'readOnly'
}

export const PREPARATION_PHASES = [
  { key: 'preDeploy', label: 'Antes de instalar', description: 'Ações executadas antes de iniciar as instalações.' },
  { key: 'staging', label: 'Itens padrão', description: 'Ações e softwares incluídos em toda preparação.' },
  { key: 'postDeploy', label: 'Depois da instalação', description: 'Ações executadas após concluir as instalações.' },
  { key: 'cleanup', label: 'Finalização', description: 'Ações finais para concluir e organizar a máquina.' },
]

export const PREPARATION_CHOICES = {
  key: 'choices',
  label: 'Escolhas da máquina',
  description: 'Opções selecionadas conforme a necessidade desta máquina.',
}

export const PREPARATION_ACTIONS = [
  { id: 'sync-time', label: 'Sincronizar horário', fields: [] },
  { id: 'save-power-settings', label: 'Salvar plano de energia', fields: [] },
  { id: 'disable-sleep-temporarily', label: 'Desativar suspensão temporariamente', fields: [] },
  { id: 'restore-power-settings', label: 'Restaurar plano de energia', fields: [] },
  { id: 'ensure-directory', label: 'Criar diretório', fields: [{ key: 'path', label: 'Diretório' }] },
  { id: 'remove-directory', label: 'Remover diretório', fields: [{ key: 'path', label: 'Diretório' }] },
  { id: 'copy-file', label: 'Copiar arquivo', fields: [{ key: 'source', label: 'Origem' }, { key: 'destination', label: 'Destino' }] },
  { id: 'copy-directory', label: 'Copiar diretório', fields: [{ key: 'source', label: 'Origem' }, { key: 'destination', label: 'Destino' }] },
  { id: 'robocopy', label: 'Cópia com Robocopy', fields: [{ key: 'source', label: 'Origem' }, { key: 'destination', label: 'Destino' }, { key: 'args', label: 'Opções' }] },
]

export function normalizePreparationProfile(profile) {
  return {
    enabled: profile?.enabled === true,
    preDeploy: Array.isArray(profile?.preDeploy) ? profile.preDeploy : [],
    staging: Array.isArray(profile?.staging) ? profile.staging : [],
    choices: Array.isArray(profile?.choices) ? profile.choices : [],
    postDeploy: Array.isArray(profile?.postDeploy) ? profile.postDeploy : [],
    cleanup: Array.isArray(profile?.cleanup) ? profile.cleanup : [],
  }
}

export function collectPreparationIds(profile) {
  const normalized = normalizePreparationProfile(profile)
  return new Set([
    ...normalized.choices.flatMap(choice => [choice.id, ...(choice.options || []).map(option => option.value)]),
    ...PREPARATION_PHASES.flatMap(phase => normalized[phase.key].map(step => step.id)),
  ].filter(Boolean))
}

export function createPreparationId(prefix, profile, now = Date.now) {
  const used = collectPreparationIds(profile)
  const base = `${prefix}-${now()}`
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

export function createCatalogId(prefix, categories, now = Date.now) {
  const used = new Set((categories || []).flatMap(category => [category.id, ...(category.softwares || []).map(item => item.id)]))
  const base = `${prefix}-${now()}`
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

export function getCatalogItems(categories) {
  return (categories || []).flatMap(category => (category.softwares || []).map(item => ({ ...item, categoryId: category.id, categoryName: category.name })))
}

export function findPreparationReferences(profile, softwareId) {
  const normalized = normalizePreparationProfile(profile)
  const references = []
  for (const choice of normalized.choices) {
    for (const option of choice.options || []) {
      if ((option.deployItems || []).includes(softwareId)) references.push({ kind: 'choice', choiceId: choice.id, choiceLabel: choice.label, optionValue: option.value, optionLabel: option.label })
    }
  }
  for (const phase of PREPARATION_PHASES) {
    normalized[phase.key].forEach(step => {
      if (step.type === 'deploy-item-ref' && step.itemId === softwareId) references.push({ kind: 'step', phase: phase.key, phaseLabel: phase.label, stepId: step.id })
    })
  }
  return references
}

export function getBrokenPreparationReferences(profile, categories) {
  const valid = new Set(getCatalogItems(categories).map(item => item.id))
  const broken = []
  const normalized = normalizePreparationProfile(profile)
  for (const choice of normalized.choices) {
    for (const option of choice.options || []) {
      for (const itemId of option.deployItems || []) {
        if (!valid.has(itemId)) broken.push({ kind: 'choice', itemId, choiceId: choice.id, choiceLabel: choice.label, optionValue: option.value, optionLabel: option.label })
      }
    }
  }
  for (const phase of PREPARATION_PHASES) {
    normalized[phase.key].forEach(step => {
      if (step.type === 'deploy-item-ref' && !valid.has(step.itemId)) broken.push({ kind: 'step', itemId: step.itemId, phase: phase.key, phaseLabel: phase.label, stepId: step.id })
    })
  }
  return broken
}

export function getPreparationProfileSummary(profile, categories) {
  const normalized = normalizePreparationProfile(profile)
  return {
    preDeploy: normalized.preDeploy.length,
    staging: normalized.staging.length,
    choices: normalized.choices.length,
    requiredChoices: normalized.choices.filter(choice => choice.required === true).length,
    postDeploy: normalized.postDeploy.length,
    cleanup: normalized.cleanup.length,
    brokenReferences: getBrokenPreparationReferences(normalized, categories).length,
  }
}

export function removePreparationReference(profile, reference) {
  const next = structuredClone(normalizePreparationProfile(profile))
  if (reference.kind === 'choice') {
    const choice = next.choices.find(item => item.id === reference.choiceId)
    const option = choice?.options?.find(item => item.value === reference.optionValue)
    if (option) option.deployItems = (option.deployItems || []).filter(id => id !== reference.itemId)
  } else {
    next[reference.phase] = next[reference.phase].filter(step => step.id !== reference.stepId)
  }
  return next
}

export function replacePreparationReference(profile, reference, nextItemId) {
  const next = structuredClone(normalizePreparationProfile(profile))
  if (reference.kind === 'choice') {
    const choice = next.choices.find(item => item.id === reference.choiceId)
    const option = choice?.options?.find(item => item.value === reference.optionValue)
    if (option) option.deployItems = [...new Set((option.deployItems || []).map(id => id === reference.itemId ? nextItemId : id))]
  } else {
    next[reference.phase] = next[reference.phase].map(step => step.id === reference.stepId ? { ...step, itemId: nextItemId } : step)
  }
  return next
}

export function formatPreparationValidationError(error, profile) {
  const choiceMatch = error?.field?.match(/^preparationProfile\.choices\[(\d+)\]\.options\[(\d+)\]\.deployItems/)
  if (choiceMatch) {
    const choice = normalizePreparationProfile(profile).choices[Number(choiceMatch[1])]
    const option = choice?.options?.[Number(choiceMatch[2])]
    return `A opção "${option?.label || 'sem nome'}" da escolha "${choice?.label || 'sem nome'}" referencia um software que não existe mais no catálogo.`
  }
  const phaseMatch = error?.field?.match(/^preparationProfile\.(preDeploy|staging|postDeploy|cleanup)\[(\d+)\]/)
  if (phaseMatch) {
    const phase = PREPARATION_PHASES.find(item => item.key === phaseMatch[1])
    return `${phase?.label || phaseMatch[1]}: ${error.reason}`
  }
  return error?.reason || 'Perfil de preparação inválido.'
}

export function getPreparationAction(actionId) {
  return PREPARATION_ACTIONS.find(action => action.id === actionId)
}

export function createActionStep(actionId, profile, now) {
  const action = getPreparationAction(actionId)
  if (!action) return null
  return {
    id: createPreparationId('step', profile, now),
    type: 'action',
    action: action.id,
    blocking: true,
    ...Object.fromEntries(action.fields.map(field => [field.key, ''])),
  }
}

export function serializePreparationProfile(profile) {
  return JSON.stringify(profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : normalizePreparationProfile(), null, 2)
}

export function getPreparationJsonModeText(currentText, error, profile) {
  return error ? currentText : serializePreparationProfile(profile)
}

export function parsePreparationJson(text) {
  try {
    const value = text.trim() ? JSON.parse(text) : normalizePreparationProfile()
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'O perfil deve ser um objeto JSON.' }
    return { ok: true, profile: value }
  } catch (error) {
    return { ok: false, error: `JSON inválido: ${error.message}` }
  }
}
