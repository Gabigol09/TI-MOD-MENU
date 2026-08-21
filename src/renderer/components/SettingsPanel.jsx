import { useState, useEffect, useCallback } from 'react'
import DeploySettings from './DeploySettings'

// Rotulo amigavel para cada chave de src/main/configLoader.js -> paths.
// Se um novo instalador for adicionado ao config.json no futuro, basta
// adicionar uma linha aqui pra ele aparecer nesta tela.
const PATH_FIELDS = [
  { key: 'office365',        label: 'Office 365 (instalador — notebooks)' },
  { key: 'office2016',       label: 'Office 2016 (instalador — desktops)' },
  { key: 'office2016Config', label: 'Office 2016 (arquivo de config .xml)' },
  { key: 'teams',            label: 'Microsoft Teams' },
  { key: 'chrome',           label: 'Google Chrome' },
  { key: 'adobeReader',      label: 'Adobe Acrobat Reader' },
  { key: 'pdfCreator',       label: 'PDF Creator' },
  { key: 'greenshot',        label: 'Greenshot' },
  { key: 'notepadPlusPlus',  label: 'Notepad++' },
  { key: 'firefox',          label: 'Firefox ESR' },
  { key: 'powerBI',          label: 'Power BI Desktop' },
]

const inputStyle = {
  width: '100%', padding: '7px 9px', borderRadius: 3, boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.4)', border: '1px solid #1A2A3A', color: '#DDE8FF',
  fontFamily: 'var(--font-mono)', fontSize: 11,
}
const labelStyle = { color: '#7A9ABB', fontSize: 10.5, marginBottom: 4, display: 'block' }
const sectionTitle = { color: '#4A8AFF', fontSize: 11.5, fontWeight: 600, margin: '16px 0 8px', letterSpacing: 0.5 }
const testBtnStyle = {
  padding: '0 12px', borderRadius: 3, fontSize: 10.5, whiteSpace: 'nowrap',
  background: 'rgba(74,136,255,0.12)', color: '#6AAAFF',
  border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
}

function get(obj, path) {
  return path.reduce((o, k) => (o ? o[k] : undefined), obj)
}

export default function SettingsPanel({ addLine, onSaved, onDirtyChange }) {
  const [cfg, setCfg] = useState(null)
  const [initialCfgStr, setInitialCfgStr] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [testResults, setTestResults] = useState({})
  const [subTab, setSubTab] = useState('general') // 'general' | 'deploy'

  useEffect(() => {
    let alive = true
    window.ti?.getConfig().then(c => {
      if (alive) {
        setCfg(c)
        const str = JSON.stringify(c)
        setInitialCfgStr(str)
        onDirtyChange?.(false)
        setLoading(false)
      }
    })
    return () => { alive = false }
  }, [onDirtyChange])

  const isDirty = Boolean(cfg && initialCfgStr && JSON.stringify(cfg) !== initialCfgStr)

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const setField = useCallback((path, value) => {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) obj[path[i]] = {}
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return next
    })
    setStatus(null)
  }, [])

  const testPath = useCallback(async (key, value) => {
    if (!value) {
      setTestResults(prev => ({ ...prev, [key]: { exists: false, error: 'Caminho não informado' } }))
      return
    }
    const res = await window.ti?.testPath(value)
    setTestResults(prev => ({ ...prev, [key]: res || { exists: false, error: 'Sem resposta do sistema' } }))
  }, [])

  const handleDiscard = useCallback(() => {
    if (!initialCfgStr) return
    try {
      const original = JSON.parse(initialCfgStr)
      setCfg(original)
      setStatus({ ok: true, msg: 'Alterações descartadas.' })
    } catch {}
  }, [initialCfgStr])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    const res = await window.ti?.saveConfig(cfg)
    setSaving(false)
    if (res?.ok) {
      const str = JSON.stringify(cfg)
      setInitialCfgStr(str)
      setStatus({ ok: true, msg: 'Salvo — já vale no próximo comando, sem reiniciar.' })
      addLine?.('> configurações salvas com sucesso')
      onSaved?.(cfg)
    } else {
      setStatus({ ok: false, msg: res?.error || 'Erro ao salvar' })
    }
  }, [cfg, addLine, onSaved])

  if (loading || !cfg) {
    return <div style={{ padding: 20, color: '#607080', fontSize: 11 }}>Carregando configurações...</div>
  }

  let patternValid = true
  try { if (cfg.hostname?.pattern) new RegExp(cfg.hostname.pattern) } catch { patternValid = false }

  const tabBtnStyle = (active) => ({
    padding: '6px 14px', borderRadius: '4px 4px 0 0', fontSize: 11, fontWeight: active ? 600 : 400,
    background: active ? 'rgba(74,136,255,0.18)' : 'rgba(0,0,0,0.3)',
    color: active ? '#6AAAFF' : '#7A9ABB',
    border: active ? '1px solid rgba(74,136,255,0.4)' : '1px solid transparent',
    borderBottom: active ? '1px solid transparent' : '1px solid rgba(74,136,255,0.2)',
    fontFamily: 'var(--font-mono)', cursor: 'pointer',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 18px' }}>
      {/* NAVEGAÇÃO DE SUB-ABAS */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(74,136,255,0.2)', marginBottom: 14 }}>
        <button style={tabBtnStyle(subTab === 'general')} onClick={() => setSubTab('general')}>
          ⚙ Configurações Gerais
        </button>
        <button style={tabBtnStyle(subTab === 'deploy')} onClick={() => setSubTab('deploy')}>
          🚀 Catálogo de Deploy
        </button>
      </div>

      {subTab === 'deploy' ? (
        <DeploySettings cfg={cfg} onChange={setField} addLine={addLine} />
      ) : (
        <>
          {/* Aviso de formato — sempre visivel no topo, antes de qualquer campo */}
          <div style={{
            background: 'rgba(74,136,255,0.08)', border: '1px solid rgba(74,136,255,0.25)',
            borderRadius: 4, padding: '10px 12px', marginBottom: 14, fontSize: 10.5,
            color: '#9AB8DD', lineHeight: 1.6,
          }}>
            <b style={{ color: '#6AAAFF' }}>Formato dos caminhos:</b> caminho completo, de rede (UNC) ou
            local, apontando direto pro arquivo do instalador (.exe / .msi) ou script (.cmd / .bat) — não
            é a pasta, é o arquivo.<br />
            Rede: <code>\\servidor\soft\Chrome\ChromeSetup.exe</code><br />
            Local: <code>C:\Instaladores\ChromeSetup.exe</code>
          </div>

          <div style={sectionTitle}>Empresa</div>
          <label style={labelStyle}>Nome (só identificação visual no app)</label>
          <input
            style={inputStyle}
            value={get(cfg, ['company', 'name']) || ''}
            onChange={e => setField(['company', 'name'], e.target.value)}
            placeholder="Minha Empresa"
          />

          <div style={sectionTitle}>Rede</div>
          <label style={labelStyle}>Servidor de software (Mapear Soft / Abrir pasta Soft)</label>
          <input
            style={{ ...inputStyle, marginBottom: 8 }}
            value={get(cfg, ['network', 'softServer']) || ''}
            onChange={e => setField(['network', 'softServer'], e.target.value)}
            placeholder="\\servidor\soft"
          />
          <label style={labelStyle}>Unidade a mapear</label>
          <input
            style={{ ...inputStyle, marginBottom: 8 }}
            value={get(cfg, ['network', 'softDrive']) || ''}
            onChange={e => setField(['network', 'softDrive'], e.target.value)}
            placeholder="S:"
          />
          <label style={labelStyle}>Gateway (Ping gateway)</label>
          <input
            style={{ ...inputStyle, marginBottom: 8 }}
            value={get(cfg, ['network', 'gateway']) || ''}
            onChange={e => setField(['network', 'gateway'], e.target.value)}
            placeholder="192.168.1.1"
          />
          <label style={labelStyle}>Perfil WiFi de referência</label>
          <input
            style={inputStyle}
            value={get(cfg, ['network', 'wifiProfile']) || ''}
            onChange={e => setField(['network', 'wifiProfile'], e.target.value)}
            placeholder="CORP_WIFI"
          />

          <div style={sectionTitle}>Padrão de hostname (usado em "Preparar máquina nova")</div>
          <label style={labelStyle}>Regex do padrão</label>
          <input
            style={{ ...inputStyle, marginBottom: 4, borderColor: patternValid ? '#1A2A3A' : '#FF5555' }}
            value={get(cfg, ['hostname', 'pattern']) || ''}
            onChange={e => setField(['hostname', 'pattern'], e.target.value)}
            placeholder="^[A-Za-z]{2}\d{5}S$"
          />
          {!patternValid && (
            <div style={{ color: '#FF5555', fontSize: 10, marginBottom: 8 }}>✗ regex inválido — não vai salvar assim</div>
          )}
          <label style={{ ...labelStyle, marginTop: patternValid ? 0 : 4 }}>Descrição do padrão (só texto de ajuda)</label>
          <input
            style={{ ...inputStyle, marginBottom: 8 }}
            value={get(cfg, ['hostname', 'patternDescription']) || ''}
            onChange={e => setField(['hostname', 'patternDescription'], e.target.value)}
            placeholder="2 letras + 5 numeros + S (ex: AB12345S)"
          />
          <label style={labelStyle}>Prefixo de notebook (detecta Office 365 vs 2016)</label>
          <input
            style={inputStyle}
            value={get(cfg, ['hostname', 'notebookPrefix']) || ''}
            onChange={e => setField(['hostname', 'notebookPrefix'], e.target.value)}
            placeholder="NB"
          />

          <div style={sectionTitle}>Caminhos dos instaladores base</div>
          {PATH_FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{f.label}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={get(cfg, ['paths', f.key]) || ''}
                  onChange={e => setField(['paths', f.key], e.target.value)}
                  placeholder="\\servidor\soft\..."
                />
                <button style={testBtnStyle} onClick={() => testPath(f.key, get(cfg, ['paths', f.key]))}>
                  Testar
                </button>
              </div>
              {testResults[f.key]?.exists === true && (
                <div style={{ color: '#00CC44', fontSize: 10, marginTop: 3 }}>✓ caminho encontrado</div>
              )}
              {testResults[f.key] && testResults[f.key]?.exists !== true && (
                <div style={{ color: '#FF5555', fontSize: 10, marginTop: 3 }}>
                  ✗ {testResults[f.key]?.error || 'não encontrado a partir desta máquina'}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* BARRA DE AÇÕES INFERIOR */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving || !patternValid}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 3, fontSize: 11.5, fontWeight: 600,
            background: isDirty ? 'rgba(74,136,255,0.25)' : 'rgba(74,136,255,0.12)',
            color: isDirty ? '#88BBFF' : '#6AAAFF',
            border: isDirty ? '1px solid rgba(74,136,255,0.5)' : '1px solid rgba(74,136,255,0.25)',
            fontFamily: 'var(--font-mono)',
            cursor: saving || !patternValid ? 'not-allowed' : 'pointer',
            opacity: saving || !patternValid ? 0.5 : 1,
            boxShadow: isDirty ? '0 0 12px rgba(74,136,255,0.2)' : 'none',
          }}
        >
          {saving ? 'SALVANDO...' : isDirty ? '💾 SALVAR ALTERAÇÕES *' : 'SALVAR CONFIGURAÇÕES'}
        </button>

        {isDirty && (
          <button
            onClick={handleDiscard}
            disabled={saving}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 3, fontSize: 10.5,
              background: 'rgba(255,68,85,0.1)', color: '#FF7788',
              border: '1px solid rgba(255,68,85,0.3)', fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            Descartar
          </button>
        )}
      </div>

      {isDirty && (
        <div style={{ marginTop: 6, fontSize: 10, color: '#FFAA55' }}>
          ● Você possui alterações não salvas nesta tela.
        </div>
      )}

      {status && (
        <div style={{ marginTop: 8, fontSize: 11, color: status.ok ? '#00CC44' : '#FF5555' }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}
    </div>
  )
}
