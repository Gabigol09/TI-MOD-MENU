import { useState, useCallback, useRef, useEffect } from 'react'
import { getPreparationBaselineIds } from '../../shared/machinePreparationWorkflow.js'

const btnActionStyle = {
  padding: '3px 8px', borderRadius: 3, fontSize: 10,
  background: 'rgba(74,136,255,0.12)', color: '#6AAAFF',
  border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', whiteSpace: 'nowrap',
}

const STATUS_ICONS = {
  idle: null,
  queued: <span style={{ color: '#FFCC00', fontSize: 11 }}>⏳</span>,
  running: <span style={{ color: '#4A8AFF', fontSize: 11, animation: 'pulse 1s infinite' }}>▶</span>,
  done: <span style={{ color: '#00CC44', fontSize: 11 }}>✓</span>,
  started: <span style={{ color: '#6AAAFF', fontSize: 11 }}>→</span>,
  error: <span style={{ color: '#FF4455', fontSize: 11 }}>✗</span>,
  cancelled: <span style={{ color: '#8899AA', fontSize: 11 }}>■</span>,
}

const STATUS_LABELS = {
  idle: '',
  queued: 'na fila',
  running: 'executando...',
  done: 'concluído',
  started: 'aberto; término não rastreável',
  error: 'erro',
  cancelled: 'interrompido',
}

export default function DeployPanel({ appConfig, addLine, isRunning, setRunning, activeRunIdRef, preparationEntry, onPreparationEntryConsumed, onQueueFinished }) {
  const categories = appConfig?.deploy?.categories || []

  // Conjunto de IDs de softwares selecionados: Set<string>
  const [selectedSofts, setSelectedSofts] = useState(() => {
    // Por padrão na carga inicial, deixa a primeira categoria marcada ou vazio
    return new Set()
  })

  // Status de execução de cada software: { [softId]: 'idle' | 'queued' | 'running' | 'done' | 'error' | 'cancelled' }
  const [itemStatuses, setItemStatuses] = useState({})
  // Mensagem de erro por item: { [softId]: string }
  const [itemErrors, setItemErrors] = useState({})

  const cancelRequestedRef = useRef(false)
  const appliedPreparationEntryRef = useRef(null)

  useEffect(() => {
    if (!preparationEntry || appliedPreparationEntryRef.current === preparationEntry) return
    appliedPreparationEntryRef.current = preparationEntry
    setSelectedSofts(new Set(getPreparationBaselineIds(categories)))
    onPreparationEntryConsumed?.(preparationEntry)
  }, [preparationEntry, categories, onPreparationEntryConsumed])

  // Sincroniza cancelamento vindo do botão PARAR global
  useEffect(() => {
    if (!isRunning) {
      cancelRequestedRef.current = true
    }
  }, [isRunning])

  // Lista plana de todos os softwares disponíveis
  const allSoftwares = categories.flatMap(c => (c.softwares || []).map(s => ({ ...s, catName: c.name, catId: c.id })))

  const toggleSelectSoft = (id) => {
    if (isRunning) return
    setSelectedSofts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectCategory = (catSoftwares) => {
    if (isRunning) return
    const ids = catSoftwares.map(s => s.id)
    const allSelected = ids.every(id => selectedSofts.has(id))
    setSelectedSofts(prev => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach(id => next.delete(id))
      } else {
        ids.forEach(id => next.add(id))
      }
      return next
    })
  }

  const selectAll = () => {
    if (isRunning) return
    setSelectedSofts(new Set(allSoftwares.map(s => s.id)))
  }

  const selectNone = () => {
    if (isRunning) return
    setSelectedSofts(new Set())
  }

  // ── Execução Sequencial do Deploy ──
  const handleExecuteDeploy = useCallback(async () => {
    if (isRunning) return
    if (!window.ti) {
      addLine?.('> [DEV] window.ti indisponível — execute no Electron')
      return
    }

    const queuedItems = allSoftwares.filter(s => selectedSofts.has(s.id))
    if (queuedItems.length === 0) {
      addLine?.('> [Deploy] Nenhum software selecionado para instalação.')
      return
    }

    cancelRequestedRef.current = false
    const runId = Date.now().toString()
    if (activeRunIdRef) activeRunIdRef.current = runId
    setRunning(true)

    // Inicializa estados
    const initStatus = {}
    const initErrors = {}
    queuedItems.forEach(item => {
      initStatus[item.id] = 'queued'
    })
    setItemStatuses(initStatus)
    setItemErrors(initErrors)

    addLine?.('> ═════════════════════════════════════════════════════')
    addLine?.(`> [Deploy] Iniciando execução em lote: ${queuedItems.length} software(s)`)
    addLine?.('> ═════════════════════════════════════════════════════')

    let successCount = 0
    let errorCount = 0
    let cancelCount = 0
    let startedCount = 0
    let configurationErrorCount = 0

    for (let i = 0; i < queuedItems.length; i++) {
      const item = queuedItems[i]

      // Verifica se houve interrupção pelo botão PARAR
      if (cancelRequestedRef.current) {
        for (let j = i; j < queuedItems.length; j++) {
          initStatus[queuedItems[j].id] = 'cancelled'
        }
        setItemStatuses({ ...initStatus })
        addLine?.(`> [Deploy] Fila cancelada pelo usuário. (${queuedItems.length - i} restante(s) não executado(s))`)
        cancelCount = queuedItems.length - i
        break
      }

      // Marca item atual como executando
      initStatus[item.id] = 'running'
      setItemStatuses({ ...initStatus })

      addLine?.(`> [Deploy] (${i + 1}/${queuedItems.length}) [${item.catName}] ${item.name}...`)

      try {
        const res = await window.ti.runDeployItem(runId, item)

        if (res?.cancelled || cancelRequestedRef.current) {
          initStatus[item.id] = 'cancelled'
          setItemStatuses({ ...initStatus })
          cancelCount++
          // Cancela os próximos
          for (let j = i + 1; j < queuedItems.length; j++) {
            initStatus[queuedItems[j].id] = 'cancelled'
          }
          setItemStatuses({ ...initStatus })
          break
        }

        if (res?.ok) {
          initStatus[item.id] = 'done'
          setItemStatuses({ ...initStatus })
          successCount++
        } else if (res?.started && res?.untracked) {
          initStatus[item.id] = 'started'
          setItemStatuses({ ...initStatus })
          startedCount++
        } else {
          initStatus[item.id] = 'error'
          initErrors[item.id] = res?.error || `Código ${res?.code || 1}`
          setItemStatuses({ ...initStatus })
          setItemErrors({ ...initErrors })
          errorCount++
          if (res?.errorType === 'configuration') configurationErrorCount++
        }
      } catch (err) {
        initStatus[item.id] = 'error'
        initErrors[item.id] = err.message
        setItemStatuses({ ...initStatus })
        setItemErrors({ ...initErrors })
        errorCount++
      }
    }

    setRunning(false)
    if (activeRunIdRef) activeRunIdRef.current = null

    addLine?.('> ─────────────────────────────────────────────────')
    addLine?.(`> [Deploy] Resumo: ${successCount} concluído(s), ${errorCount} erro(s), ${cancelCount} cancelado(s), ${startedCount} aberto(s) sem rastreamento.`)
    addLine?.('> ─────────────────────────────────────────────────')
    onQueueFinished?.({
      successCount,
      errorCount,
      cancelCount,
      startedCount,
      totalCount: queuedItems.length,
      configurationErrorCount,
      cancelled: cancelCount > 0,
    })
  }, [allSoftwares, selectedSofts, isRunning, setRunning, activeRunIdRef, addLine, onQueueFinished])

  const selectedCount = selectedSofts.size

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* BARRA DE AÇÕES SUPERIOR */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', background: 'rgba(10, 20, 34, 0.6)',
        borderBottom: '1px solid rgba(74,136,255,0.15)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button style={btnActionStyle} onClick={selectAll} disabled={isRunning}>
            Marcar Todos
          </button>
          <button style={btnActionStyle} onClick={selectNone} disabled={isRunning}>
            Desmarcar Todos
          </button>
          <span style={{ color: '#7A9ABB', fontSize: 10.5, marginLeft: 4 }}>
            <b>{selectedCount}</b> selecionado(s)
          </span>
        </div>

        <button
          onClick={handleExecuteDeploy}
          disabled={isRunning || selectedCount === 0}
          style={{
            padding: '5px 14px', borderRadius: 3, fontSize: 11, fontWeight: 600,
            background: isRunning ? 'rgba(255,136,68,0.2)' : selectedCount > 0 ? 'rgba(74,136,255,0.25)' : 'rgba(74,136,255,0.08)',
            color: isRunning ? '#FFAA55' : selectedCount > 0 ? '#6AAAFF' : '#506070',
            border: isRunning ? '1px solid rgba(255,136,68,0.4)' : selectedCount > 0 ? '1px solid rgba(74,136,255,0.4)' : '1px solid rgba(74,136,255,0.15)',
            fontFamily: 'var(--font-mono)', cursor: isRunning || selectedCount === 0 ? 'not-allowed' : 'pointer',
            boxShadow: selectedCount > 0 && !isRunning ? '0 0 10px rgba(74,136,255,0.2)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {isRunning ? '⏳ EXECUTANDO DEPLOY...' : `▶ EXECUTAR DEPLOY (${selectedCount})`}
        </button>
      </div>

      {/* LISTA HIERÁRQUICA COM ROLAGEM */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 16px' }}>
        {categories.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6A8AA8', fontSize: 11 }}>
            Nenhuma categoria ou software configurado para o Deploy.<br /><br />
            Acesse a aba <b>⚙ Configurações → Catálogo de Deploy</b> para cadastrar softwares.
          </div>
        ) : (
          categories.map(cat => {
            const catSoftwares = cat.softwares || []
            if (catSoftwares.length === 0) return null
            const allCatSelected = catSoftwares.every(s => selectedSofts.has(s.id))
            const someCatSelected = catSoftwares.some(s => selectedSofts.has(s.id))

            return (
              <div
                key={cat.id}
                style={{
                  background: 'rgba(8, 16, 26, 0.45)', border: '1px solid rgba(74,136,255,0.12)',
                  borderRadius: 4, marginBottom: 10, padding: '8px 10px',
                }}
              >
                {/* CABEÇALHO DA CATEGORIA */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid rgba(74,136,255,0.08)', paddingBottom: 6, marginBottom: 6,
                }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 6, cursor: isRunning ? 'default' : 'pointer',
                    userSelect: 'none', color: '#4A8AFF', fontWeight: 600, fontSize: 11,
                  }}>
                    <input
                      type="checkbox"
                      checked={allCatSelected}
                      ref={el => { if (el) el.indeterminate = !allCatSelected && someCatSelected }}
                      onChange={() => toggleSelectCategory(catSoftwares)}
                      disabled={isRunning}
                      style={{ cursor: 'pointer', accentColor: '#4A8AFF' }}
                    />
                    <span>{cat.name}</span>
                    <span style={{ color: '#446688', fontSize: 9.5, fontWeight: 400 }}>
                      ({catSoftwares.length})
                    </span>
                  </label>
                </div>

                {/* ITENS DE SOFTWARE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {catSoftwares.map(soft => {
                    const isSelected = selectedSofts.has(soft.id)
                    const status = itemStatuses[soft.id] || 'idle'
                    const errorMsg = itemErrors[soft.id]

                    return (
                      <div
                        key={soft.id}
                        onClick={() => toggleSelectSoft(soft.id)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 8px', borderRadius: 3,
                          background: status === 'running'
                            ? 'rgba(74,136,255,0.15)'
                            : status === 'done'
                            ? 'rgba(0,204,68,0.08)'
                            : status === 'error'
                            ? 'rgba(255,68,85,0.1)'
                            : isSelected
                            ? 'rgba(74,136,255,0.06)'
                            : 'rgba(0,0,0,0.2)',
                          border: status === 'running'
                            ? '1px solid rgba(74,136,255,0.5)'
                            : status === 'done'
                            ? '1px solid rgba(0,204,68,0.3)'
                            : status === 'error'
                            ? '1px solid rgba(255,68,85,0.35)'
                            : isSelected
                            ? '1px solid rgba(74,136,255,0.2)'
                            : '1px solid #101E2E',
                          cursor: isRunning ? 'default' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Checkbox + Nome + Tipo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // tratado no onClick do container
                            disabled={isRunning}
                            style={{ cursor: 'pointer', accentColor: '#4A8AFF' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                color: isSelected ? '#DDE8FF' : '#90A0B0',
                                fontWeight: isSelected ? 500 : 400,
                                fontSize: 11,
                              }}>
                                {soft.name}
                              </span>
                              <span style={{
                                fontSize: 8.5, padding: '1px 4px', borderRadius: 2,
                                background: 'rgba(74,136,255,0.12)', color: '#6AAAFF',
                              }}>
                                {soft.type === 'script' ? 'SCRIPT' : soft.type === 'open' ? 'SHELL' : 'EXE/MSI'}
                              </span>
                            </div>
                            {soft.description && (
                              <span style={{ color: '#557090', fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {soft.description}
                              </span>
                            )}
                            {errorMsg && (
                              <span style={{ color: '#FF5566', fontSize: 9.5, marginTop: 1 }}>
                                ✗ {errorMsg}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          {STATUS_ICONS[status]}
                          {STATUS_LABELS[status] && (
                            <span style={{
                              fontSize: 9.5,
                              color: status === 'done' ? '#00CC44' : status === 'error' ? '#FF5566' : status === 'running' ? '#6AAAFF' : '#8899AA',
                            }}>
                              {STATUS_LABELS[status]}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
