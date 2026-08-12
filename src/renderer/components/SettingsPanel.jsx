import { useState, useEffect, useCallback } from 'react'

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

export default function SettingsPanel({ addLine, onSaved }) {
  const [cfg, setCfg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [testResults, setTestResults] = useState({})

  useEffect(() => {
    let alive = true
    window.ti?.getConfig().then(c => {
      if (alive) { setCfg(c); setLoading(false) }
    })
    return () => { alive = false }
  }, [])

  const setField = useCallback((path, value) => {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
      obj[path[path.length - 1]] = value
      return next
    })
    setStatus(null)
  }, [])

  const testPath = useCallback(async (key, value) => {
    if (!value) { setTestResults(prev => ({ ...prev, [key]: false })); return }
    const res = await window.ti?.testPath(value)
    setTestResults(prev => ({ ...prev, [key]: !!res?.exists }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    const res = await window.ti?.saveConfig(cfg)
    setSaving(false)
    if (res?.ok) {
      setStatus({ ok: true, msg: 'Salvo — ja vale no proximo comando, sem reiniciar.' })
      addLine?.('> configuracoes salvas')
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

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 18px' }}>
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

      <div style={sectionTitle}>Caminhos dos instaladores</div>
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
          {testResults[f.key] === true && (
            <div style={{ color: '#00CC44', fontSize: 10, marginTop: 3 }}>✓ caminho encontrado</div>
          )}
          {testResults[f.key] === false && (
            <div style={{ color: '#FF5555', fontSize: 10, marginTop: 3 }}>
              ✗ não encontrado a partir desta máquina (confira se o servidor está acessível)
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving || !patternValid}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 3, fontSize: 11.5, marginTop: 6,
          background: 'rgba(74,136,255,0.15)', color: '#6AAAFF',
          border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)',
          cursor: saving || !patternValid ? 'not-allowed' : 'pointer',
          opacity: saving || !patternValid ? 0.5 : 1,
        }}
      >
        {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
      </button>
      {status && (
        <div style={{ marginTop: 8, fontSize: 11, color: status.ok ? '#00CC44' : '#FF5555' }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}
    </div>
  )
}
