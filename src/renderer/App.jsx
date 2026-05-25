import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { CATEGORIES } from '../shared/commands.js'
import { buildCategories } from '../shared/resolveCommand.js'

// ─── Estilos inline (sem CSS-in-JS pesado) ───────────────────
const S = {
  root: {
    display: 'flex', flexDirection: 'column',
    width: '100vw', height: '100vh',
    background: 'rgba(4, 7, 15, 0.88)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(74,136,255,0.18)',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(74,136,255,0.08)',
    fontFamily: 'var(--font-mono)',
  },
  header: {
    display: 'flex', alignItems: 'center',
    height: 34, minHeight: 34,
    background: 'rgba(10,24,64,0.97)',
    borderBottom: '1px solid rgba(74,136,255,0.2)',
    padding: '0 10px 0 14px',
    WebkitAppRegion: 'drag',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 11, fontWeight: 600, letterSpacing: 2,
    color: '#DDE8FF', flex: 1,
  },
  headerCounter: {
    fontSize: 10, color: 'rgba(74,136,255,0.7)',
    letterSpacing: 1, marginRight: 12,
  },
  body: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  sidebar: {
    width: 140, minWidth: 140,
    background: 'rgba(5,9,18,0.95)',
    borderRight: '1px solid rgba(74,136,255,0.10)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarLabel: {
    fontSize: 9, color: 'rgba(74,136,255,0.35)',
    letterSpacing: 2, padding: '8px 10px 4px',
    textTransform: 'uppercase',
  },
  panel: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  panelHeader: {
    padding: '6px 14px 5px',
    borderBottom: '1px solid rgba(74,136,255,0.08)',
    flexShrink: 0,
  },
  cmdList: {
    flex: 1, overflowY: 'auto', padding: '2px 0',
  },
  tipBar: {
    padding: '5px 14px',
    fontSize: 10, color: 'rgba(0,180,60,0.75)',
    borderTop: '1px solid rgba(0,180,60,0.08)',
    background: 'rgba(0,20,8,0.6)',
    minHeight: 24, flexShrink: 0,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  terminal: {
    height: 130, minHeight: 130,
    background: 'rgba(1,6,3,0.97)',
    borderTop: '1px solid rgba(0,180,60,0.15)',
    padding: '6px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    color: '#00BB33',
    overflowY: 'auto',
    flexShrink: 0,
  },
  footer: {
    height: 28, minHeight: 28,
    display: 'flex', alignItems: 'center',
    padding: '0 10px',
    background: 'rgba(3,6,10,0.98)',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    gap: 6,
    flexShrink: 0,
  },
}

// ─── Botão header ────────────────────────────────────────────
function HBtn({ children, color = '#7A9ABB', onClick, title }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        WebkitAppRegion: 'no-drag',
        width: 28, height: 22, borderRadius: 3,
        fontSize: 10, fontWeight: 600, color,
        background: hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
        transition: 'all 0.12s',
        letterSpacing: 0.5,
      }}
    >{children}</button>
  )
}

// ─── Item de categoria ────────────────────────────────────────
function CatItem({ cat, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '7px 10px 7px 12px',
        fontSize: 11, fontWeight: active ? 500 : 400,
        color: active ? '#DDE8FF' : '#607080',
        background: active ? 'rgba(74,136,255,0.14)' : 'transparent',
        borderLeft: `2px solid ${active ? '#4A8AFF' : 'transparent'}`,
        transition: 'all 0.1s',
        letterSpacing: 0.3,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#AAC8EE'; e.currentTarget.style.background = 'rgba(74,136,255,0.06)' }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#607080'; e.currentTarget.style.background = 'transparent' }}}
    >
      {cat.name}
    </button>
  )
}

// ─── Item de comando ──────────────────────────────────────────
function CmdItem({ cmd, selected, index, onClick, onDblClick }) {
  const [hover, setHover] = useState(false)
  const active = selected || hover
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDblClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '6px 14px',
        borderLeft: `2px solid ${selected ? '#4A8AFF' : 'transparent'}`,
        background: selected ? 'rgba(74,136,255,0.16)' : hover ? 'rgba(74,136,255,0.07)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.08s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: selected ? 500 : 400,
          color: cmd.dangerous ? '#FF6666' : selected ? '#DDE8FF' : '#AAC8EE',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cmd.dangerous && <span style={{ color: '#FF4444', marginRight: 5 }}>⚠</span>}
          {cmd.name}
        </div>
        <div style={{
          fontSize: 9.5, color: '#2A4A66',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginTop: 1,
        }}>
          {cmd.desc}
        </div>
      </div>
    </div>
  )
}

// ─── Linha do terminal ────────────────────────────────────────
function TermLine({ line }) {
  const color =
    line.startsWith('  [ERR]') || line.startsWith('  [ERRO]') ? '#FF5555' :
    line.startsWith('$ ') ? '#5599FF' :
    line.startsWith('> ===') ? '#FFDD44' :
    line.startsWith('> OK') || line.includes('sucesso') || line.includes('mapeada') ? '#44FF88' :
    line.startsWith('> AVISO') || line.startsWith('> ⚠') ? '#FFAA33' :
    '#00BB33'
  return <div style={{ color, lineHeight: 1.6 }}>{line}</div>
}

// ─── Botão footer ─────────────────────────────────────────────
function FBtn({ children, onClick, color = '#334455', activeColor, active }) {
  const [hover, setHover] = useState(false)
  const c = active && activeColor ? activeColor : hover ? '#7A9ABB' : color
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 10px', borderRadius: 3, fontSize: 10,
        color: c,
        border: `1px solid ${active ? (activeColor || '#334455') : hover ? '#334455' : '#1A2A3A'}`,
        background: active ? 'rgba(74,136,255,0.08)' : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        letterSpacing: 1, transition: 'all 0.1s', fontWeight: 500,
      }}
    >{children}</button>
  )
}

// ─── Modal de confirmação ─────────────────────────────────────
function ConfirmModal({ cmd, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(8,14,26,0.98)',
        border: '1px solid rgba(255,68,85,0.4)',
        borderRadius: 6, padding: '20px 24px', maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{ color: '#FF4455', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚠ AÇÃO IRREVERSÍVEL</div>
        <div style={{ color: '#AAC8EE', fontSize: 11, marginBottom: 6 }}>{cmd.name}</div>
        <div style={{ color: '#607080', fontSize: 10, marginBottom: 16 }}>{cmd.tip}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '7px 0', borderRadius: 3, fontSize: 11,
            background: 'rgba(255,68,85,0.15)', color: '#FF6666',
            border: '1px solid rgba(255,68,85,0.3)',
            fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>CONFIRMAR</button>
          <button onClick={onCancel} style={{
            flex: 1, padding: '7px 0', borderRadius: 3, fontSize: 11,
            background: 'transparent', color: '#607080',
            border: '1px solid #1A2A3A',
            fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>CANCELAR</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal credenciais (net use — sem PowerShell) ─────────────
function CredentialsModal({ title, onSubmit, onCancel }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(8,14,26,0.98)',
        border: '1px solid rgba(74,136,255,0.35)',
        borderRadius: 6, padding: '20px 24px', width: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        <div style={{ color: '#4A8AFF', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ color: '#607080', fontSize: 10, marginBottom: 12 }}>
          Usuario de rede (ex: EMPRESA\seu.usuario). Senha nao e registrada no log.
        </div>
        <input
          value={user}
          onChange={e => setUser(e.target.value)}
          placeholder="DOMINIO\\usuario"
          autoFocus
          style={{
            width: '100%', marginBottom: 8, padding: '8px 10px', borderRadius: 3,
            background: 'rgba(0,0,0,0.4)', border: '1px solid #1A2A3A', color: '#DDE8FF',
            fontFamily: 'var(--font-mono)', fontSize: 11,
          }}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="senha"
          onKeyDown={e => e.key === 'Enter' && user && password && onSubmit(user, password)}
          style={{
            width: '100%', marginBottom: 14, padding: '8px 10px', borderRadius: 3,
            background: 'rgba(0,0,0,0.4)', border: '1px solid #1A2A3A', color: '#DDE8FF',
            fontFamily: 'var(--font-mono)', fontSize: 11,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={!user || !password}
            onClick={() => onSubmit(user, password)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 3, fontSize: 11,
              background: 'rgba(74,136,255,0.15)', color: '#6AAAFF',
              border: '1px solid rgba(74,136,255,0.3)',
              fontFamily: 'var(--font-mono)', cursor: user && password ? 'pointer' : 'not-allowed',
              opacity: user && password ? 1 : 0.5,
            }}
          >MAPEAR</button>
          <button onClick={onCancel} style={{
            flex: 1, padding: '7px 0', borderRadius: 3, fontSize: 11,
            background: 'transparent', color: '#607080',
            border: '1px solid #1A2A3A', fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>CANCELAR</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal WMIC ───────────────────────────────────────────────
function WmicModal({ onInstall, onSkip }) {
  const [installing, setInstalling] = useState(false)
  const [pct, setPct] = useState(0)
  const [status, setStatus] = useState('')
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!installing) return
    const ti = window.ti
    ti.onWmicProgress(({ pct: p, status: s }) => { setPct(p); setStatus(s) })
    ti.onWmicDone(({ success }) => {
      if (success) { setPct(100); setStatus('WMIC instalado com sucesso!'); setDone(true) }
      else { setFailed(true); setStatus('Instalação falhou — tente manualmente') }
      setTimeout(() => success ? onInstall() : null, 2000)
    })
    return () => {
      ti.removeCmdListeners && ti.removeCmdListeners()
    }
  }, [installing])

  const handleInstall = () => {
    setInstalling(true)
    window.ti.installWmic()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(6,10,20,0.98)',
        border: '1px solid rgba(74,136,255,0.25)',
        borderRadius: 8, padding: '20px 24px', width: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{ color: '#FFDD44', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>⚠ WMIC não encontrado</div>
        
        {!installing ? <>
          <div style={{ color: '#AAC8EE', fontSize: 11, marginBottom: 10 }}>
            O WMIC melhora o funcionamento do programa:
          </div>
          {['Serial BIOS mais preciso','Device ID (UUID) nativo','Info de GPU e monitores','Desinstalar programas via menu'].map(t => (
            <div key={t} style={{ color: '#00AA33', fontSize: 10.5, marginBottom: 3 }}>+ {t}</div>
          ))}
          <div style={{ color: '#FF8844', fontSize: 10, marginTop: 10, marginBottom: 4 }}>
            ⏱ Tempo estimado: 2 a 5 minutos
          </div>
          <div style={{ color: '#607080', fontSize: 10, marginBottom: 16 }}>
            Sem WMIC: na execucao serao usados comandos CMD/reg alternativos.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleInstall} style={{
              flex: 2, padding: '8px 0', borderRadius: 3, fontSize: 10.5,
              background: 'rgba(74,136,255,0.12)', color: '#4A8AFF',
              border: '1px solid rgba(74,136,255,0.3)',
              fontFamily: 'var(--font-mono)', cursor: 'pointer', fontWeight: 600,
            }}>HABILITAR WMIC (~2-5 min)</button>
            <button onClick={onSkip} style={{
              flex: 1, padding: '8px 0', borderRadius: 3, fontSize: 10.5,
              background: 'transparent', color: '#405060',
              border: '1px solid #1A2A3A',
              fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}>Continuar sem</button>
          </div>
        </> : <>
          <div style={{ color: '#7A9ABB', fontSize: 10.5, marginBottom: 10 }}>{status || 'Inicializando DISM...'}</div>
          {/* Barra de progresso */}
          <div style={{
            height: 8, background: 'rgba(74,136,255,0.1)',
            borderRadius: 4, overflow: 'hidden', marginBottom: 8,
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${pct}%`,
              background: failed ? '#FF4455' : done ? '#00CC44' : 'linear-gradient(90deg, #2255CC, #4A8AFF)',
              transition: 'width 0.5s ease',
              boxShadow: done ? '0 0 8px rgba(0,200,68,0.6)' : '0 0 8px rgba(74,136,255,0.4)',
            }} />
          </div>
          <div style={{ color: '#405060', fontSize: 10, textAlign: 'right' }}>{pct}%</div>
          {done && <div style={{ color: '#00CC44', fontSize: 11, marginTop: 8, textAlign: 'center' }}>✓ Reinicie o programa para ativar todos os comandos</div>}
          {failed && <div style={{ color: '#FF5555', fontSize: 10, marginTop: 8 }}>Configurações → Apps → Recursos opcionais → WMIC</div>}
        </>}
      </div>
    </div>
  )
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
const SCRIPTS_NEED_CRED = new Set(['SCRIPT_MAPEAR_SOFT', 'SCRIPT_NOVA_MAQ'])

export default function App() {
  const [wmicOk, setWmicOk]       = useState(true)
  const cats = useMemo(() => buildCategories(CATEGORIES, wmicOk), [wmicOk])
  const [catIdx, setCatIdx] = useState(0)
  const [cmdIdx, setCmdIdx] = useState(0)
  const [pinned, setPinned]   = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [termLines, setTermLines] = useState([
    '> TI Director Mode v1.5 — Empresa',
    '> Motor: CMD / WMIC / DISM (sem PowerShell)',
    '> Tab: categoria | Setas: comando | Enter: executar',
    '> ─────────────────────────────────────────────────',
  ])
  const [running, setRunning]     = useState(false)
  const [confirm, setConfirm]     = useState(null)
  const [showWmic, setShowWmic]   = useState(false)
  const [credModal, setCredModal] = useState(null)
  const termRef = useRef(null)
  const cmdListRef = useRef(null)
  const activeRunId = useRef(null)

  const cat  = cats[catIdx]
  const cmd  = cat?.cmds[cmdIdx]

  // ── Scroll terminal para o fim ──
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight
    }
  }, [termLines])

  const addLine = useCallback((line) => {
    setTermLines(prev => [...prev.slice(-150), line])
    window.ti?.writeLog(line)
  }, [])

  // ── Boot: admin (net session) + WMIC + fallbacks ──
  useEffect(() => {
    const ti = window.ti
    if (!ti) {
      addLine('> [DEV] window.ti indisponivel — rode no Electron')
      return
    }
    Promise.all([ti.checkAdmin(), ti.checkWmic()]).then(([admin, wmic]) => {
      addLine(admin
        ? '> Admin: SIM (elevado) — net session ok'
        : '> Admin: NAO — gpupdate/sfc/reset podem falhar')
      if (wmic) {
        setWmicOk(true)
        addLine('> WMIC: disponivel')
      } else {
        setWmicOk(false)
        addLine('> WMIC: limitado — fallbacks CMD/reg/devmgmt na execucao')
        setShowWmic(true)
      }
      addLine('> ─────────────────────────────────────────────────')
    })
  }, [])

  // ── Listeners IPC ──
  useEffect(() => {
    const ti = window.ti
    if (!ti) return
    ti.onCmdLine(({ line }) => addLine(line))
    ti.onCmdDone(({ code, cancelled }) => {
      if (cancelled) addLine('> interrompido')
      else if (code === 0) addLine('> concluido ✓')
      else addLine(`> encerrado com codigo ${code}`)
      activeRunId.current = null
      setRunning(false)
    })
    return () => ti.removeCmdListeners()
  }, [addLine])

  // ── Teclado ──
  useEffect(() => {
    const handler = (e) => {
      if (confirm || showWmic || credModal) return
      if (e.key === 'Tab') {
        e.preventDefault()
        setCatIdx(i => (i + (e.shiftKey ? -1 : 1) + cats.length) % cats.length)
        setCmdIdx(0)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCmdIdx(i => Math.max(0, i - 1))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCmdIdx(i => Math.min(cat.cmds.length - 1, i + 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleRunOrStop()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [catIdx, cmdIdx, cat, cmd, confirm, showWmic, credModal, running, cats])

  const stopRunning = useCallback(() => {
    const id = activeRunId.current
    if (id) window.ti?.stopCmd(id)
  }, [])

  const handleRunOrStop = useCallback(() => {
    if (running) {
      stopRunning()
      return
    }
    if (!cmd) return
    if (cmd.dangerous) { setConfirm(cmd); return }
    runCmd(cmd)
  }, [cmd, running, stopRunning])

  const runCmd = useCallback((c) => {
    if (!window.ti) {
      addLine('> [DEV] window.ti nao disponivel — rode no Electron')
      return
    }
    const id = Date.now().toString()
    activeRunId.current = id
    setRunning(true)
    addLine(`> [${cat.name}] ${c.name}`)
    if (c.type === 'cmd') {
      window.ti.runCmd(id, c.cmd, c.silent || false)
    } else if (c.type === 'open' || c.type === 'msc') {
      window.ti.runOpen(id, c.cmd)
    } else if (c.type === 'script') {
      startScript(c.cmd)
    }
  }, [cat, addLine])

  const runScriptNow = useCallback((scriptId, credentials = {}) => {
    if (!window.ti) return
    const id = Date.now().toString()
    activeRunId.current = id
    setRunning(true)
    addLine(`> [script] ${scriptId}`)
    window.ti.runScript(scriptId, id, credentials)
  }, [addLine])

  const startScript = useCallback(async (scriptId) => {
    if (!window.ti) {
      addLine('> [DEV] window.ti nao disponivel — rode no Electron')
      return
    }
    if (SCRIPTS_NEED_CRED.has(scriptId)) {
      const mapped = await window.ti.checkSoftMapped()
      if (mapped && scriptId === 'SCRIPT_MAPEAR_SOFT') {
        addLine('> S: ja mapeado — nada a fazer')
        return
      }
      if (!mapped) {
        setCredModal({
          scriptId,
          title: scriptId === 'SCRIPT_MAPEAR_SOFT'
            ? 'Mapear unidade S: (Soft)'
            : 'Credenciais para mapear S:',
        })
        return
      }
      addLine('> S: ja mapeado — seguindo script')
    }
    runScriptNow(scriptId)
  }, [addLine, runScriptNow])

  const togglePin = () => {
    const next = !pinned
    setPinned(next)
    window.ti?.togglePin(next)
  }

  const clearTerminal = () => {
    setTermLines([`> terminal limpo — ${new Date().toLocaleTimeString()}`, '> ──────────────────────────────────────────'])
  }

  if (minimized) {
    return (
      <div style={{ ...S.header, borderRadius: 8, border: '1px solid rgba(74,136,255,0.2)' }}>
        <span style={S.headerTitle}>TI DIRECTOR MODE  v1.5</span>
        <span style={S.headerCounter}>{catIdx+1} / {cats.length}</span>
        <HBtn color={pinned ? '#FFDD44' : '#405060'} onClick={togglePin} title="Fixar janela">P</HBtn>
        <HBtn onClick={() => setMinimized(false)} title="Restaurar">□</HBtn>
        <HBtn color='#FF5566' onClick={() => window.ti?.close()} title="Fechar">✕</HBtn>
      </div>
    )
  }

  return (
    <div style={{ ...S.root, position: 'relative' }}>
      {/* HEADER */}
      <div style={S.header}>
        <span style={S.headerTitle}>TI DIRECTOR MODE&nbsp;&nbsp;v1.5</span>
        <span style={S.headerCounter}>{catIdx+1} / {cats.length}</span>
        <div style={{ display:'flex', gap:3, WebkitAppRegion:'no-drag' }}>
          <HBtn color={pinned?'#FFDD44':'#405060'} onClick={togglePin} title="Fixar/soltar janela">
            {pinned ? '* P' : '  P'}
          </HBtn>
          <HBtn onClick={() => setMinimized(true)} title="Minimizar">_</HBtn>
          <HBtn color='#FF5566' onClick={() => window.ti?.close()} title="Fechar">✕</HBtn>
        </div>
      </div>

      {/* BODY */}
      <div style={S.body}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          <div style={S.sidebarLabel}>CATEGORIAS</div>
          {cats.map((c, i) => (
            <CatItem key={c.id} cat={c} active={i === catIdx}
              onClick={() => { setCatIdx(i); setCmdIdx(0) }} />
          ))}
        </div>

        {/* PANEL */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4A8AFF', letterSpacing: 0.5 }}>
              {cat.name}
            </div>
            <div style={{ fontSize: 10, color: '#2A4A6A', marginTop: 1 }}>{cat.sub}</div>
          </div>

          <div style={S.cmdList} ref={cmdListRef}>
            {cat.cmds.map((c, i) => (
              <CmdItem key={i} cmd={c} selected={i === cmdIdx} index={i}
                onClick={() => setCmdIdx(i)}
                onDblClick={() => { setCmdIdx(i); setTimeout(handleRunOrStop, 50) }}
              />
            ))}
          </div>

          <div style={S.tipBar}>
            {cmd ? `>> ${cmd.tip}` : 'selecione um comando'}
          </div>
        </div>
      </div>

      {/* TERMINAL */}
      <div style={S.terminal} ref={termRef}>
        {termLines.map((l, i) => <TermLine key={i} line={l} />)}
        <span style={{ display:'inline-block', width:7, height:12, background:'#00BB33', verticalAlign:-2, animation:'blink 1s step-end infinite' }} />
      </div>

      {/* FOOTER */}
      <div style={S.footer}>
        <FBtn
          onClick={handleRunOrStop}
          color={running ? '#FF8844' : '#4A8AFF'}
          activeColor={running ? '#FFAA55' : '#6AAAFF'}
          active={running}
        >
          {running ? '■ PARAR' : '▶ EXECUTAR'}
        </FBtn>
        <div style={{ flex:1 }} />
        <span style={{ fontSize: 9, color: '#1A2A3A', letterSpacing: 1 }}>
          tab:cat&nbsp;&nbsp;↑↓:cmd&nbsp;&nbsp;enter:exec/parar
        </span>
        <div style={{ flex:1 }} />
        <FBtn onClick={clearTerminal}>CLR</FBtn>
        <FBtn onClick={() => window.ti?.openLog()}>LOG</FBtn>
      </div>

      {/* MODAIS */}
      {confirm && (
        <ConfirmModal cmd={confirm}
          onConfirm={() => { setConfirm(null); runCmd(confirm) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {credModal && (
        <CredentialsModal
          title={credModal.title}
          onSubmit={(user, password) => {
            const { scriptId } = credModal
            setCredModal(null)
            runScriptNow(scriptId, { user, password })
          }}
          onCancel={() => setCredModal(null)}
        />
      )}
      {showWmic && (
        <WmicModal
          onInstall={() => { setShowWmic(false); addLine('> WMIC instalado — reinicie para ativar todos os comandos') }}
          onSkip={() => { setShowWmic(false); addLine('> continuando sem WMIC — fallbacks CMD/reg ativos') }}
        />
      )}
    </div>
  )
}
