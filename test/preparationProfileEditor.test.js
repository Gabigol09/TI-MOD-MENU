import { describe, expect, it } from 'vitest'
import {
  PREPARATION_ACTIONS,
  PREPARATION_CHOICES,
  PREPARATION_PHASES,
  createActionStep,
  createCatalogId,
  createPreparationId,
  findPreparationReferences,
  formatPreparationValidationError,
  getBrokenPreparationReferences,
  getPreparationJsonModeText,
  getPreparationProfileSummary,
  isSharedConfigReadOnly,
  normalizePreparationProfile,
  parsePreparationJson,
  removePreparationReference,
  replacePreparationReference,
  serializePreparationProfile,
} from '../src/shared/preparationProfileEditor.js'

const categories = [{ id: 'cat-a', name: 'Básicos', softwares: [
  { id: 'soft-a', name: 'Aplicativo A', type: 'script', path: 'C:\\Pacotes\\a.bat' },
  { id: 'soft-b', name: 'Aplicativo B', type: 'script', path: 'C:\\Pacotes\\b.bat' },
] }]

const profile = {
  enabled: true,
  preDeploy: [], staging: [], postDeploy: [], cleanup: [],
  choices: [{ id: 'choice-a', label: 'Versão', required: true, options: [{ value: 'option-a', label: 'A', deployItems: ['soft-a'] }] }],
}

describe('preparation profile editor model', () => {
  it('normaliza profile existente sem criar schema paralelo', () => {
    expect(normalizePreparationProfile({ enabled: true })).toEqual({ enabled: true, preDeploy: [], staging: [], choices: [], postDeploy: [], cleanup: [] })
  })

  it('mapeia fases internas para linguagem operacional sem alterar as chaves', () => {
    expect(PREPARATION_PHASES.map(phase => [phase.key, phase.label])).toEqual([
      ['preDeploy', 'Antes de instalar'],
      ['staging', 'Itens padrão'],
      ['postDeploy', 'Depois da instalação'],
      ['cleanup', 'Finalização'],
    ])
    expect(PREPARATION_CHOICES).toMatchObject({ key: 'choices', label: 'Escolhas da máquina' })
    expect([...PREPARATION_PHASES.slice(0, 2).map(phase => phase.key), PREPARATION_CHOICES.key, ...PREPARATION_PHASES.slice(2).map(phase => phase.key)]).toEqual(['preDeploy', 'staging', 'choices', 'postDeploy', 'cleanup'])
    expect([...PREPARATION_PHASES, PREPARATION_CHOICES].every(phase => phase.description.length > 0)).toBe(true)
  })

  it('resume profile vazio com contagens zeradas', () => {
    expect(getPreparationProfileSummary({}, categories)).toEqual({ preDeploy: 0, staging: 0, choices: 0, requiredChoices: 0, postDeploy: 0, cleanup: 0, brokenReferences: 0 })
  })

  it('resume profile preenchido, choices obrigatórias e referências quebradas', () => {
    const filled = {
      ...profile,
      preDeploy: [{ id: 'step-pre', type: 'action', action: 'sync-time' }],
      staging: [{ id: 'step-stage', type: 'deploy-item-ref', itemId: 'soft-a' }],
      choices: [
        ...profile.choices,
        { id: 'choice-b', label: 'Complemento', required: false, options: [{ value: 'option-b', label: 'B', deployItems: ['missing-soft'] }] },
      ],
      postDeploy: [{ id: 'step-post', type: 'action', action: 'sync-time' }],
      cleanup: [{ id: 'step-clean', type: 'action', action: 'restore-power-settings' }],
    }
    expect(getPreparationProfileSummary(filled, categories)).toEqual({ preDeploy: 1, staging: 1, choices: 2, requiredChoices: 1, postDeploy: 1, cleanup: 1, brokenReferences: 1 })
    expect(filled.choices.map(choice => choice.required)).toEqual([true, false])
  })

  it('gera IDs únicos e estáveis no objeto criado', () => {
    const now = () => 10
    expect(createPreparationId('step', { ...profile, preDeploy: [{ id: 'step-10' }] }, now)).toBe('step-10-2')
    const step = createActionStep('sync-time', profile, now)
    expect(step).toMatchObject({ id: 'step-10', type: 'action', action: 'sync-time', blocking: true })
    expect(createCatalogId('soft', categories, () => 10)).toBe('soft-10')
  })

  it('não oferece action arbitrária e expõe somente campos dinâmicos do registry visual', () => {
    expect(PREPARATION_ACTIONS.some(action => action.id === 'execute-any-command')).toBe(false)
    expect(PREPARATION_ACTIONS.find(action => action.id === 'save-power-settings').fields).toEqual([])
    expect(PREPARATION_ACTIONS.find(action => action.id === 'copy-file').fields.map(field => field.key)).toEqual(['source', 'destination'])
    expect(PREPARATION_ACTIONS.find(action => action.id === 'robocopy').fields.map(field => field.key)).toEqual(['source', 'destination', 'args'])
    expect(createActionStep('execute-any-command', profile)).toBeNull()
  })

  it('rename preserva referência porque identidade é o ID', () => {
    const renamed = [{ ...categories[0], softwares: categories[0].softwares.map(item => item.id === 'soft-a' ? { ...item, name: 'Aplicativo Novo' } : item) }]
    expect(getBrokenPreparationReferences(profile, renamed)).toEqual([])
    expect(findPreparationReferences(profile, 'soft-a')[0]).toMatchObject({ choiceLabel: 'Versão', optionLabel: 'A' })
  })

  it('delete detecta impacto e mantém referência quebrada explícita', () => {
    const refs = findPreparationReferences(profile, 'soft-a')
    expect(refs).toHaveLength(1)
    const deleted = [{ ...categories[0], softwares: categories[0].softwares.filter(item => item.id !== 'soft-a') }]
    expect(getBrokenPreparationReferences(profile, deleted)[0]).toMatchObject({ itemId: 'soft-a', choiceLabel: 'Versão' })
  })

  it('remove e substitui referência quebrada sem alterar outras opções', () => {
    const broken = getBrokenPreparationReferences(profile, [{ ...categories[0], softwares: [categories[0].softwares[1]] }])[0]
    expect(removePreparationReference(profile, broken).choices[0].options[0].deployItems).toEqual([])
    expect(replacePreparationReference(profile, broken, 'soft-b').choices[0].options[0].deployItems).toEqual(['soft-b'])
  })

  it('sincroniza Visual para JSON e JSON válido para modelo', () => {
    const text = serializePreparationProfile(profile)
    const parsed = parsePreparationJson(text)
    expect(parsed.ok).toBe(true)
    expect(parsed.profile.choices[0].options[0].deployItems).toEqual(['soft-a'])
  })

  it('preserva texto inválido ao trocar de modo e não destrói o modelo válido', () => {
    const invalid = parsePreparationJson('{')
    expect(invalid.ok).toBe(false)
    expect(invalid.error).toContain('JSON inválido')
    expect(getPreparationJsonModeText('{', invalid.error, profile)).toBe('{')
    expect(getPreparationJsonModeText('antigo', null, profile)).toBe(serializePreparationProfile(profile))
  })

  it('traduz erro técnico de choice para contexto humano', () => {
    const message = formatPreparationValidationError({ field: 'preparationProfile.choices[0].options[0].deployItems', reason: 'referência inexistente' }, profile)
    expect(message).toContain('A opção "A"')
    expect(message).toContain('escolha "Versão"')
  })

  it('classifica read-only para bloquear editor visual e JSON', () => {
    expect(isSharedConfigReadOnly({ state: 'readOnly' })).toBe(true)
    expect(isSharedConfigReadOnly({ state: 'ready' })).toBe(false)
  })
})
