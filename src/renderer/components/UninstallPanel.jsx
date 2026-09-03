import { useState, useEffect, useCallback } from 'react'
import { buildDynamicUninstallList, openNativeFallback, UNINSTALL_STATUS } from '../../shared/dynamicUninstall.js'

const buttonStyle = {
  padding: '4px 10px', borderRadius: 3, fontSize: 10,
  background: 'rgba(74,136,255,0.12)', color: '#6AAAFF',
  border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)',
  cursor: 'pointer', whiteSpace: 'nowrap',
}

const STATUS_CONFIG = {
  [UNINSTALL_STATUS.NO_STRATEGY]: { label: 'Detectado sem remoção direta', color: '#FFCC66', border: 'rgba(255,204,102,0.3)' },
  [UNINSTALL_STATUS.INSTALLED]: { label: 'Instalado', color: '#00CC44', border: 'rgba(0,204,68,0.3)' },
  [UNINSTALL_STATUS.NOT_INSTALLED]: { label: 'Não instalado', color: '#708090', border: 'rgba(112,128,144,0.2)' },
  [UNINSTALL_STATUS.AMBIGUOUS]: { label: 'Detecção ambígua', color: '#FFAA55', border: 'rgba(255,170,85,0.3)' },
  [UNINSTALL_STATUS.UNKNOWN]: { label: 'Desconhecido', color: '#8899AA', border: 'rgba(136,153,170,0.2)' },
}

export default function UninstallPanel({ appConfig, addLine }) {
  const [inventoryResult, setInventoryResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [otherInstalledExpanded, setOtherInstalledExpanded] = useState(false)

  const fetchInventory = useCallback(async (refresh = false) => {
    if (!window.ti?.getInstalledSoftwareInventory) {
      setError('API de inventário indisponível.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.ti.getInstalledSoftwareInventory(refresh)
      setInventoryResult(result)
      if (!result?.ok) setError(result?.error || 'Não foi possível carregar o inventário local.')
    } catch (err) {
      setInventoryResult({ ok: false, status: 'error', items: [] })
      setError(err.message || 'Erro ao consultar inventário.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory(false)
  }, [fetchInventory])

  const model = buildDynamicUninstallList(appConfig?.deploy?.categories || [], inventoryResult)

  const openFallback = fallback => {
    const id = Date.now().toString()
    if (openNativeFallback(fallback, window.ti, id)) {
      addLine?.(`> [Desinstalar] Abrindo ferramenta nativa: ${fallback.name}`)
      return
    }
    addLine?.('> [Desinstalar] Tipo de ferramenta nativa inválido.')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(10,20,34,0.6)', borderBottom: '1px solid rgba(74,136,255,0.15)', flexShrink: 0, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 10.5, flexWrap: 'wrap' }}>
          <span style={{ color: '#00CC44', fontWeight: 600 }}>{model.installedCount} detectado(s)</span>
          <span style={{ color: '#708090' }}>{model.notInstalledCount} não instalado(s)</span>
          {model.unknownCount > 0 && <span style={{ color: '#FFAA55' }}>{model.unknownCount} sem certeza</span>}
          {model.otherInstalledCount > 0 && <span style={{ color: '#7A9ABB' }}>{model.otherInstalledCount} outro(s) instalado(s)</span>}
        </div>
        <button style={buttonStyle} onClick={() => fetchInventory(true)} disabled={loading}>
          {loading ? 'Verificando...' : 'Atualizar inventário'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {inventoryResult?.status === 'partial' && (
          <div style={{ background: 'rgba(255,170,85,0.1)', border: '1px solid rgba(255,170,85,0.3)', borderRadius: 4, padding: '8px 10px', color: '#FFBB66', fontSize: 10.5 }}>
            Inventário parcial: itens não encontrados permanecem desconhecidos.
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.3)', borderRadius: 4, padding: '8px 10px', color: '#FF7788', fontSize: 10.5 }}>
            {error}
          </div>
        )}

        <div>
          <div style={{ color: '#7A9ABB', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>SOFTWARES DO CATÁLOGO DE DEPLOY</div>
          {model.items.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#6A8AA8', fontSize: 11, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
              Nenhum software cadastrado no Catálogo de Deploy.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {model.items.map(item => {
                const config = STATUS_CONFIG[item.status] || STATUS_CONFIG[UNINSTALL_STATUS.UNKNOWN]
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 4, background: 'rgba(8,16,26,0.5)', border: `1px solid ${config.border}`, gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: '#DDE8FF', fontSize: 11, fontWeight: 500 }}>{item.name}</span>
                        <span style={{ fontSize: 8.5, padding: '1px 4px', borderRadius: 2, background: 'rgba(74,136,255,0.1)', color: '#7A9ABB' }}>{item.catName}</span>
                        {item.version && <span style={{ fontSize: 8.5, color: '#A0B4C8' }}>v{item.version}</span>}
                      </div>
                      {item.publisher && <span style={{ color: '#607890', fontSize: 9.5 }}>Publicador: {item.publisher}</span>}
                      {item.status === UNINSTALL_STATUS.NO_STRATEGY && <span style={{ color: '#DDAA55', fontSize: 9 }}>Use uma ferramenta nativa do Windows para remover.</span>}
                    </div>
                    <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: 3, color: config.color, border: `1px solid ${config.border}`, fontSize: 9.5 }}>{config.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {model.isInventoryAvailable && (
          <div>
            <button
              type="button"
              aria-expanded={otherInstalledExpanded}
              aria-controls="other-installed-items"
              onClick={() => setOtherInstalledExpanded(expanded => !expanded)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: 0, marginBottom: otherInstalledExpanded ? 6 : 0, border: 0, background: 'transparent', color: '#7A9ABB', fontFamily: 'var(--font-mono)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>OUTROS SOFTWARES INSTALADOS</span>
              <span style={{ padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(122,154,187,0.3)', fontSize: 8.5 }}>Informativo</span>
              <span aria-hidden="true" style={{ marginLeft: 'auto', fontSize: 10 }}>{otherInstalledExpanded ? '▼' : '▶'}</span>
            </button>
            {otherInstalledExpanded && (
              <div id="other-installed-items">
                {model.otherInstalledItems.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: '#6A8AA8', fontSize: 10.5, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                    Nenhum outro software foi observado no inventário atual.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {model.otherInstalledItems.map(item => (
                      <div key={item.id} style={{ padding: '7px 10px', borderRadius: 4, background: 'rgba(8,16,26,0.5)', border: '1px solid rgba(122,154,187,0.22)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: '#DDE8FF', fontSize: 11, fontWeight: 500 }}>{item.name}</span>
                            {item.version && <span style={{ fontSize: 8.5, color: '#A0B4C8' }}>v{item.version}</span>}
                          </div>
                          {item.publisher && <span style={{ color: '#607890', fontSize: 9.5 }}>Publicador: {item.publisher}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ color: '#7A9ABB', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>FERRAMENTAS NATIVAS DO WINDOWS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {model.fallbacks.map(fallback => (
              <div key={fallback.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 4, background: 'rgba(12,22,36,0.6)', border: '1px solid rgba(74,136,255,0.2)', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                  <span style={{ color: '#C8DCF0', fontSize: 11, fontWeight: 500 }}>{fallback.name}</span>
                  <span style={{ color: '#6A88A8', fontSize: 9.5 }}>{fallback.description}</span>
                </div>
                <button style={buttonStyle} onClick={() => openFallback(fallback)}>Abrir</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
