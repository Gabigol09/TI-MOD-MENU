import { describe, expect, it } from 'vitest'
import {
  PREPARATION_ACTIONS,
  createActionStep,
  createCatalogId,
  createPreparationId,
  findPreparationReferences,
  formatPreparationValidationError,
  getBrokenPreparationReferences,
  getPreparationJsonModeText,
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
