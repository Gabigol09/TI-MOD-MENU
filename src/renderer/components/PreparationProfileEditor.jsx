import { useMemo, useState } from 'react'
import {
  PREPARATION_ACTIONS,
  PREPARATION_CHOICES,
  PREPARATION_PHASES,
  createActionStep,
  createPreparationId,
  getBrokenPreparationReferences,
  formatPreparationValidationError,
  getCatalogItems,
  getPreparationAction,
  getPreparationProfileSummary,
  normalizePreparationProfile,
  removePreparationReference,
  replacePreparationReference,
} from '../../shared/preparationProfileEditor.js'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 3, background: 'rgba(0,0,0,0.38)', border: '1px solid #1A2A3A', color: '#DDE8FF', fontFamily: 'var(--font-mono)', fontSize: 10.5 }
const buttonStyle = { padding: '4px 8px', borderRadius: 3, background: 'rgba(74,136,255,0.12)', color: '#78AFFF', border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)', fontSize: 9.5, cursor: 'pointer' }
const dangerStyle = { ...buttonStyle, background: 'rgba(255,68,85,0.08)', color: '#FF7788', borderColor: 'rgba(255,68,85,0.25)' }

function move(items, index, direction) {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function CatalogSelector({ categories, selectedIds, onChange, readOnly }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  return (
    <div style={{ border: '1px solid #1A2A3A', borderRadius: 4, padding: 7, background: 'rgba(0,0,0,0.2)' }}>
      <input style={{ ...inputStyle, marginBottom: 6 }} value={search} disabled={readOnly} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar por nome, categoria ou descrição" />
      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
        {(categories || []).map(category => {
          const items = (category.softwares || []).filter(item => !query || `${item.name} ${item.description || ''} ${category.name}`.toLowerCase().includes(query))
          if (!items.length) return null
          return <div key={category.id} style={{ marginBottom: 7 }}>
            <div style={{ color: '#6A9AD0', fontSize: 9.5, fontWeight: 600, marginBottom: 3 }}>{category.name}</div>
            {items.map(item => <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B8C8D8', fontSize: 10, marginBottom: 3 }}>
              <input type="checkbox" disabled={readOnly} checked={selectedIds.includes(item.id)} onChange={() => onChange(selectedIds.includes(item.id) ? selectedIds.filter(id => id !== item.id) : [...selectedIds, item.id])} />
              <span>{item.name}</span>
              <span style={{ color: '#60758A', fontSize: 8.5 }}>{item.type === 'script' ? 'SCRIPT' : item.type === 'open' ? 'SHELL' : 'EXE/MSI'}</span>
            </label>)}
          </div>
        })}
      </div>
    </div>
  )
}

function StepEditor({ step, categories, readOnly, onChange, onRemove, onMoveUp, onMoveDown, first, last }) {
  const definition = step.type === 'action' ? getPreparationAction(step.action) : null
  const catalog = getCatalogItems(categories)
  const referenced = step.type === 'deploy-item-ref' ? catalog.find(item => item.id === step.itemId) : null
  return (
    <div style={{ background: 'rgba(8,16,28,0.7)', border: '1px solid rgba(74,136,255,0.15)', borderRadius: 4, padding: 8, marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
        <div style={{ flex: 1, color: '#C8D8EA', fontSize: 10.5, fontWeight: 600 }}>{step.type === 'deploy-item-ref' ? referenced?.name || 'Item do catálogo não encontrado' : definition?.label || step.action}</div>
        <button style={buttonStyle} disabled={readOnly || first} onClick={onMoveUp}>↑</button>
        <button style={buttonStyle} disabled={readOnly || last} onClick={onMoveDown}>↓</button>
        <button style={dangerStyle} disabled={readOnly} onClick={onRemove}>Remover</button>
      </div>
      {step.type === 'deploy-item-ref' ? (
        <div>
          {!referenced && <div style={{ color: '#FFBB55', fontSize: 10, marginBottom: 5 }}>⚠ Item do catálogo não encontrado · ID: {step.itemId}</div>}
          <select style={inputStyle} disabled={readOnly} value={referenced ? step.itemId : ''} onChange={event => onChange({ ...step, itemId: event.target.value })}>
            <option value="">Selecionar software</option>
            {catalog.map(item => <option key={item.id} value={item.id}>{item.categoryName} · {item.name} · {item.type}</option>)}
          </select>
        </div>
      ) : definition?.fields.map(field => <div key={field.key} style={{ marginBottom: 6 }}>
        <label style={{ color: '#7189A2', fontSize: 9.5, display: 'block', marginBottom: 3 }}>{field.label}</label>
        <input style={inputStyle} disabled={readOnly} value={step[field.key] || ''} onChange={event => onChange({ ...step, [field.key]: event.target.value })} />
      </div>)}
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#879AAF', fontSize: 9.5 }}>
        <input type="checkbox" disabled={readOnly} checked={step.blocking !== false} onChange={event => onChange({ ...step, blocking: event.target.checked })} />
        Falha bloqueia o fluxo
      </label>
    </div>
  )
}

function PhaseEditor({ phase, profile, categories, readOnly, onChange }) {
  const [newType, setNewType] = useState('sync-time')
  const steps = profile[phase.key]
  const add = () => {
    const step = newType === 'deploy-item-ref'
      ? { id: createPreparationId('step', profile), type: 'deploy-item-ref', itemId: '', blocking: true }
      : createActionStep(newType, profile)
    if (step) onChange({ ...profile, [phase.key]: [...steps, step] })
  }
  return (
    <section style={{ marginBottom: 12 }}>
      <div style={{ color: '#5F9DE5', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{phase.label}</div>
      <div style={{ color: '#7189A2', fontSize: 9.5, lineHeight: 1.4, marginBottom: 6 }}>{phase.description}</div>
      {steps.length === 0 && <div style={{ color: '#53687E', fontSize: 9.5, marginBottom: 6 }}>Nenhuma etapa configurada.</div>}
      {steps.map((step, index) => <StepEditor key={step.id} step={step} categories={categories} readOnly={readOnly} first={index === 0} last={index === steps.length - 1}
        onChange={nextStep => onChange({ ...profile, [phase.key]: steps.map(item => item.id === step.id ? nextStep : item) })}
        onRemove={() => onChange({ ...profile, [phase.key]: steps.filter(item => item.id !== step.id) })}
        onMoveUp={() => onChange({ ...profile, [phase.key]: move(steps, index, -1) })}
        onMoveDown={() => onChange({ ...profile, [phase.key]: move(steps, index, 1) })} />)}
      <div style={{ display: 'flex', gap: 5 }}>
        <select style={{ ...inputStyle, flex: 1 }} disabled={readOnly} value={newType} onChange={event => setNewType(event.target.value)}>
          {PREPARATION_ACTIONS.map(action => <option key={action.id} value={action.id}>{action.label}</option>)}
          <option value="deploy-item-ref">Executar item do catálogo</option>
        </select>
        <button style={buttonStyle} disabled={readOnly} onClick={add}>+ Adicionar</button>
      </div>
    </section>
  )
}

function ChoiceEditor({ choice, profile, categories, readOnly, onChange, onRemove, onMoveUp, onMoveDown, first, last }) {
  const addOption = () => {
    const value = createPreparationId('option', profile)
    onChange({ ...choice, options: [...(choice.options || []), { value, label: 'Nova opção', deployItems: [] }] })
  }
  const required = choice.required === true
  return (
    <div style={{ background: required ? 'rgba(255,190,60,0.07)' : 'rgba(8,16,28,0.7)', border: `1px solid ${required ? 'rgba(255,190,60,0.45)' : 'rgba(74,136,255,0.18)'}`, borderLeft: required ? '3px solid #FFCC66' : '1px solid rgba(74,136,255,0.18)', borderRadius: 4, padding: 9, marginBottom: 8 }}>
      {required && <div style={{ color: '#FFCC66', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>OBRIGATÓRIA</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
        <input style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0 }} disabled={readOnly} value={choice.label || ''} onChange={event => onChange({ ...choice, label: event.target.value })} placeholder="Nome da escolha" />
        <button style={buttonStyle} disabled={readOnly || first} onClick={onMoveUp}>↑</button>
        <button style={buttonStyle} disabled={readOnly || last} onClick={onMoveDown}>↓</button>
        <button style={dangerStyle} disabled={readOnly} onClick={onRemove}>Remover</button>
      </div>
      <label style={{ display: 'flex', gap: 6, color: required ? '#FFCC66' : '#879AAF', fontSize: 9.5, fontWeight: required ? 600 : 400, marginBottom: 7 }}><input type="checkbox" disabled={readOnly} checked={required} onChange={event => onChange({ ...choice, required: event.target.checked })} /> Escolha obrigatória</label>
      {(choice.options || []).map((option, index) => <div key={option.value} style={{ borderTop: index ? '1px solid #142335' : 'none', paddingTop: index ? 7 : 0, marginTop: index ? 7 : 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
          <input style={{ ...inputStyle, flex: '1 1 160px', minWidth: 0 }} disabled={readOnly} value={option.label || ''} onChange={event => onChange({ ...choice, options: choice.options.map(item => item.value === option.value ? { ...item, label: event.target.value } : item) })} placeholder="Nome da opção" />

          <button style={dangerStyle} disabled={readOnly} onClick={() => onChange({ ...choice, options: choice.options.filter(item => item.value !== option.value) })}>Remover opção</button>
        </div>
        <CatalogSelector categories={categories} readOnly={readOnly} selectedIds={option.deployItems || []} onChange={deployItems => onChange({ ...choice, options: choice.options.map(item => item.value === option.value ? { ...item, deployItems } : item) })} />
      </div>)}
      <button style={{ ...buttonStyle, marginTop: 7 }} disabled={readOnly} onClick={addOption}>+ Adicionar opção</button>
    </div>
  )
}

export default function PreparationProfileEditor({ profile: sourceProfile, categories, validationErrors = [], readOnly, readOnlyMessage, onChange }) {
  const profile = normalizePreparationProfile(sourceProfile)
  const broken = useMemo(() => getBrokenPreparationReferences(profile, categories), [profile, categories])
  const summary = useMemo(() => getPreparationProfileSummary(profile, categories), [profile, categories])
  const catalog = getCatalogItems(categories)
  const addChoice = () => onChange({ ...profile, choices: [...profile.choices, { id: createPreparationId('choice', profile), label: 'Nova escolha', required: false, options: [] }] })

  return (
    <div>
      {readOnly && <div style={{ color: '#FFCC66', background: 'rgba(255,190,60,0.08)', border: '1px solid rgba(255,190,60,0.25)', padding: 8, borderRadius: 4, fontSize: 10, marginBottom: 10 }}>{readOnlyMessage || 'Configuração compartilhada em modo somente leitura. Visualização permitida; edição e salvamento desabilitados.'}</div>}
      <label style={{ display: 'flex', gap: 7, alignItems: 'center', color: '#B8C8D8', fontSize: 10.5, marginBottom: 12 }}><input type="checkbox" disabled={readOnly} checked={profile.enabled} onChange={event => onChange({ ...profile, enabled: event.target.checked })} /> Ativar perfil de preparação</label>

      <section style={{ background: 'rgba(74,136,255,0.06)', border: '1px solid rgba(74,136,255,0.2)', borderRadius: 4, padding: 8, marginBottom: 12 }}>
        <div style={{ color: '#8DB8EA', fontSize: 10.5, fontWeight: 600, marginBottom: 6 }}>Resumo do profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '5px 10px', color: '#AFC1D4', fontSize: 9.5, lineHeight: 1.4 }}>
          <span>Antes de instalar: <strong>{summary.preDeploy}</strong></span>
          <span>Itens padrão: <strong>{summary.staging}</strong></span>
          <span>Escolhas: <strong>{summary.choices}</strong></span>
          <span>Obrigatórias: <strong>{summary.requiredChoices}</strong></span>
          <span>Depois da instalação: <strong>{summary.postDeploy}</strong></span>
          <span>Finalização: <strong>{summary.cleanup}</strong></span>
          <span style={{ color: summary.brokenReferences ? '#FFCC66' : '#7F94AA' }}>Referências quebradas: <strong>{summary.brokenReferences}</strong></span>
        </div>
      </section>

      {broken.length > 0 && <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 4, padding: 8, marginBottom: 10 }}>
        <div style={{ color: '#FFCC66', fontSize: 10.5, fontWeight: 600, marginBottom: 5 }}>Referências quebradas</div>
        {broken.map((reference, index) => <div key={`${reference.itemId}-${index}`} style={{ marginBottom: 7 }}>
          <div style={{ color: '#B8C8D8', fontSize: 9.5 }}>⚠ Item do catálogo não encontrado · {reference.kind === 'choice' ? `${reference.choiceLabel} → ${reference.optionLabel}` : reference.phaseLabel}</div>
          <div style={{ color: '#60758A', fontSize: 8.5, marginBottom: 4 }}>ID: {reference.itemId}</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <select style={{ ...inputStyle, flex: 1 }} disabled={readOnly} defaultValue="" onChange={event => event.target.value && onChange(replacePreparationReference(profile, reference, event.target.value))}>
              <option value="">Substituir por...</option>
              {catalog.map(item => <option key={item.id} value={item.id}>{item.categoryName} · {item.name}</option>)}
            </select>
            <button style={dangerStyle} disabled={readOnly} onClick={() => onChange(removePreparationReference(profile, reference))}>Remover referência</button>
          </div>
        </div>)}
      </div>}

      {PREPARATION_PHASES.slice(0, 2).map(phase => <PhaseEditor key={phase.key} phase={phase} profile={profile} categories={categories} readOnly={readOnly} onChange={onChange} />)}

      <section style={{ marginBottom: 12 }}>
        <div style={{ color: '#5F9DE5', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{PREPARATION_CHOICES.label}</div>
        <div style={{ color: '#7189A2', fontSize: 9.5, lineHeight: 1.4, marginBottom: 6 }}>{PREPARATION_CHOICES.description}</div>
        {profile.choices.length === 0 && <div style={{ color: '#53687E', fontSize: 9.5, marginBottom: 6 }}>Nenhuma escolha configurada.</div>}
        {profile.choices.map((choice, index) => <ChoiceEditor key={choice.id} choice={choice} profile={profile} categories={categories} readOnly={readOnly} first={index === 0} last={index === profile.choices.length - 1}
          onChange={nextChoice => onChange({ ...profile, choices: profile.choices.map(item => item.id === choice.id ? nextChoice : item) })}
          onRemove={() => onChange({ ...profile, choices: profile.choices.filter(item => item.id !== choice.id) })}
          onMoveUp={() => onChange({ ...profile, choices: move(profile.choices, index, -1) })}
          onMoveDown={() => onChange({ ...profile, choices: move(profile.choices, index, 1) })} />)}
        <button style={buttonStyle} disabled={readOnly} onClick={addChoice}>+ Adicionar escolha</button>
      </section>

      {PREPARATION_PHASES.slice(2).map(phase => <PhaseEditor key={phase.key} phase={phase} profile={profile} categories={categories} readOnly={readOnly} onChange={onChange} />)}

      {validationErrors.filter(error => error.field?.startsWith('preparationProfile')).map((error, index) => <div key={`${error.field}-${index}`} style={{ color: '#FF6677', fontSize: 9.5, marginTop: 4 }}>{formatPreparationValidationError(error, profile)}<div style={{ color: '#60758A', fontSize: 8 }}>Detalhe: {error.field}</div></div>)}
    </div>
  )
}
