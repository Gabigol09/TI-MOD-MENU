import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { CATEGORIES } from '../shared/commands.js'
import { buildCategories } from '../shared/resolveCommand.js'
import SettingsPanel from './components/SettingsPanel.jsx'
import DeployPanel from './components/DeployPanel.jsx'

// Codigos de saida que tipicamente indicam problema de rede/permissao
// (nao arquivo ausente, nao instalador quebrado) — usados para decidir se
// vale oferecer autenticar com outro usuario em vez de so mostrar o erro.
const NETWORK_AUTH_CODES = new Set([5, 51, 53, 64, 67, 1219, 1326])

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
    background: 'linear-gradient(180deg, rgba(14,32,80,0.98) 0%, rgba(10,24,64,0.97) 100%)',
    borderBottom: '1px solid rgba(74,136,255,0.45)',
    boxShadow: '0 1px 0 rgba(74,136,255,0.12), 0 4px 24px rgba(74,136,255,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
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
    display: 'flex', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden',
  },
  sidebar: {
    width: 'clamp(110px, 19%, 160px)', minWidth: 110,
    background: 'rgba(5,9,18,0.95)',
    borderRight: '1px solid rgba(74,136,255,0.10)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarLabel: {
    fontSize: 'clamp(8px, 1.8vh, 9px)', color: 'rgba(120,160,220,0.65)',
    letterSpacing: 2, padding: 'clamp(5px, 1.5vh, 8px) 10px clamp(2px, 0.8vh, 4px)',
    textTransform: 'uppercase', flexShrink: 0,
  },
  categoryList: {
    flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
    overscrollBehavior: 'contain', scrollbarGutter: 'stable',
  },
  panel: {
    flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
    height: 'clamp(90px, 26%, 180px)', minHeight: 90,
    background: 'rgba(1,6,3,0.97)',
    borderTop: '2px solid rgba(0,200,68,0.35)',
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.4), 0 -1px 0 rgba(0,200,68,0.08)',
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
function HBtn({ children, color = '#7A9ABB', onClick, title, disabled = false, pressed }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick} title={title} aria-label={title} aria-pressed={pressed}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        WebkitAppRegion: 'no-drag',
        width: 28, height: 22, borderRadius: 3,
        fontSize: 10, fontWeight: 600, color,
        background: hover && !disabled ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: `1px solid ${hover && !disabled ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
        transition: 'all 0.12s',
        letterSpacing: 0.5,
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  )
}

// ─── Item de categoria ────────────────────────────────────────
function CatItem({ cat, active, onClick, itemRef }) {
  return (
    <button
      ref={itemRef}
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: 'clamp(4px, 1.5vh, 7px) 10px clamp(4px, 1.5vh, 7px) 12px',
        fontSize: 'clamp(9.5px, 2.2vh, 11px)', lineHeight: 1.2, fontWeight: active ? 600 : 500,
        color: active ? '#EEF4FF' : '#9BB4D4',
        background: active ? 'rgba(74,136,255,0.18)' : 'transparent',
        borderLeft: `2px solid ${active ? '#5A9AFF' : 'rgba(74,136,255,0.12)'}`,
        transition: 'all 0.1s',
        letterSpacing: 0.3,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#C8DCF5'; e.currentTarget.style.background = 'rgba(74,136,255,0.10)' }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#9BB4D4'; e.currentTarget.style.background = 'transparent' }}}
    >
      {cat.name}
    </button>
  )
}

// ─── Item de comando ──────────────────────────────────────────
function CmdItem({ cmd, selected, index, onClick, onDblClick, itemRef }) {
  const [hover, setHover] = useState(false)
  const active = selected || hover
  return (
    <div
      ref={itemRef}
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
    line.startsWith('[A]') || line.startsWith('ATENÇÃO') ? '#FF5555' :
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
        borderRadius: 6, padding: '20px 24px', maxWidth: 'min(340px, calc(100vw - 32px))',
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
        borderRadius: 6, padding: '20px 24px', width: 'min(340px, calc(100vw - 32px))',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        <div style={{ color: '#4A8AFF', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ color: '#607080', fontSize: 10, marginBottom: 12 }}>
          Usuario de rede (ex: EMPRESA\seu.usuario). Senha nao e registrada no log.
          O app tenta mapear pela sessao atual e pelo Explorer antes de usar estas credenciais.
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
          >TENTAR</button>
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

// ─── Modal de Alterações Não Salvas ───────────────────────────
function UnsavedModal({ onDiscard, onStay }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 110,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(10,16,28,0.98)',
        border: '1px solid rgba(255,170,0,0.4)',
        borderRadius: 6, padding: '18px 22px', width: 'min(360px, calc(100vw - 32px))',
        boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{ color: '#FFCC00', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          ⚠ Alterações não salvas
        </div>
        <div style={{ color: '#AAC8EE', fontSize: 11, marginBottom: 16, lineHeight: 1.5 }}>
          Você fez modificações em Configurações que ainda não foram salvas no disco. Deseja realmente sair sem salvar?
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onStay}
            style={{
              padding: '6px 14px', borderRadius: 3, fontSize: 10.5,
              background: 'transparent', color: '#8899AA',
              border: '1px solid #1A2A3A', fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >
            Permanecer
          </button>
          <button
            onClick={onDiscard}
            style={{
              padding: '6px 14px', borderRadius: 3, fontSize: 10.5, fontWeight: 600,
              background: 'rgba(255,68,85,0.15)', color: '#FF6677',
              border: '1px solid rgba(255,68,85,0.35)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
            }}
          >
            Sair sem salvar
          </button>
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
        borderRadius: 8, padding: '20px 24px', width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
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
const SCRIPTS_NEED_CRED = new Set(['SCRIPT_MAPEAR_SOFT'])

export default function App() {
  const [wmicOk, setWmicOk]       = useState(true)
  const cats = useMemo(() => {
    const base = buildCategories(CATEGORIES, wmicOk)
    return [
      ...base,
      { id: 'deploy', name: 'Deploy', icon: '🚀', sub: 'catálogo / rollout em massa', special: 'deploy', cmds: [] },
      { id: '__settings__', name: 'Configurações', icon: '⚙', sub: 'caminhos e ajustes', special: 'settings', cmds: [] },
    ]
  }, [wmicOk])
  const [catIdx, setCatIdx] = useState(0)
  const [cmdIdx, setCmdIdx] = useState(0)
  const [pinned, setPinned]   = useState(true)
  const [pinPending, setPinPending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [termLines, setTermLines] = useState([
    '> TI Director Mode',
    '> Motor: CMD / WMIC / DISM (sem PowerShell)',
    '> Tab: categoria | Setas: comando | Enter: executar',
    '> ─────────────────────────────────────────────────',
  ])
  const [running, setRunning]     = useState(false)
  const [confirm, setConfirm]     = useState(null)
  const [showWmic, setShowWmic]   = useState(false)
  const [credModal, setCredModal] = useState(null)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [unsavedModal, setUnsavedModal] = useState(null)
  const termRef = useRef(null)
  const cmdListRef = useRef(null)
  const commandItemRefs = useRef([])
  const categoryItemRefs = useRef([])
  const activeRunId = useRef(null)
  const pendingAuthRef = useRef(null)
  const lastOpenRef = useRef(null)
  const lastScriptRef = useRef(null)
  const [appConfig, setAppConfig] = useState(null)
  const [appVersion, setAppVersion] = useState('')

  const cat  = cats[catIdx]
  const cmd  = cat?.cmds[cmdIdx]

  // Carrega o config.json uma vez, para saber o servidor de software
  // configurado e assim decidir se um comando "open" precisa checar
  // autenticacao de rede antes de abrir.
  useEffect(() => {
    window.ti?.getConfig().then(setAppConfig)
  }, [])

  useEffect(() => {
    window.ti?.getAppVersion().then(version => {
      setAppVersion(version)
      setTermLines(prev => prev.map((line, index) => index === 0 ? `> TI Director Mode v${version}` : line))
    })
  }, [])

  useEffect(() => {
    window.ti?.getPinState().then(setPinned)
  }, [])

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
    Promise.all([ti.checkAdmin(), ti.checkWmic(), ti.checkHostname()]).then(([admin, wmic, hostname]) => {
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
      if (hostname.status === 'mismatch') {
        addLine('[A] ATENÇÃO: HOSTNAME FORA DO PADRÃO CONFIGURADO')
      } else if (hostname.status === 'invalid-pattern') {
        addLine('  [ERRO] Configuração inválida: regex de hostname incorreta')
      }
      addLine('> ─────────────────────────────────────────────────')
    })
  }, [])

  // ── Listeners IPC ──
  useEffect(() => {
    const ti = window.ti
    if (!ti) return
    ti.onCmdLine(({ line }) => addLine(line))
    ti.onCmdDone(({ id, code, cancelled }) => {
      const pendingOpen = lastOpenRef.current?.id === id ? lastOpenRef.current : null
      lastOpenRef.current = null

      if (cancelled) {
        addLine('> interrompido')
      } else if (code === 0) {
        addLine('> concluido ✓')
      } else if (NETWORK_AUTH_CODES.has(code) && pendingOpen) {
        addLine('> falha parece ser de rede/permissao — a sessao atual pode nao ter acesso a esse servidor')
        setCredModal({
          mode: 'network',
          uncRoot: pendingOpen.uncRoot,
          pendingCmd: { cmd: pendingOpen.cmd, name: pendingOpen.name, kind: pendingOpen.kind },
          title: `Sem acesso a ${pendingOpen.uncRoot} — tentar com outro usuario`,
        })
        activeRunId.current = null
        setRunning(false)
        return
      } else if (
        code === 2 &&
        lastScriptRef.current &&
        SCRIPTS_NEED_CRED.has(lastScriptRef.current)
      ) {
        addLine('> mapeamento hibrido esgotado — informe credenciais TI')
        setCredModal({
          scriptId: lastScriptRef.current,
          title: lastScriptRef.current === 'SCRIPT_MAPEAR_SOFT'
            ? 'Mapear unidade S: (Soft)'
            : 'Credenciais para mapear S:',
        })
        activeRunId.current = null
        setRunning(false)
        return
      } else {
        addLine(`> encerrado com codigo ${code}`)
      }
      activeRunId.current = null
      setRunning(false)
    })
    ti.onNetworkAuthDone(({ id, code }) => {
      if (id !== activeRunId.current) return // acao ja foi cancelada/substituida
      const pending = pendingAuthRef.current
      pendingAuthRef.current = null
      if (code === 0 && pending) {
        const openId = Date.now().toString()
        activeRunId.current = openId
        lastOpenRef.current = null // ja tentou autenticar uma vez — nao oferece de novo num 2o erro
        if (pending.kind === 'folder' || pending.kind === 'path') window.ti.runOpenPath(openId, pending.cmd)
        else window.ti.runOpen(openId, pending.cmd)
      } else {
        addLine('> abortado — autenticacao de rede falhou, comando nao foi aberto')
        activeRunId.current = null
        setRunning(false)
      }
    })
    return () => ti.removeCmdListeners()
  }, [addLine])

  const stopRunning = useCallback(() => {
    const id = activeRunId.current
    if (id) window.ti?.stopCmd(id)
  }, [])

  const runScriptNow = useCallback((scriptId, credentials = {}) => {
    if (!window.ti) return
    const id = Date.now().toString()
    lastScriptRef.current = scriptId
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
    }
    runScriptNow(scriptId)
  }, [addLine, runScriptNow])

  const startOpen = useCallback((c) => {
    if (!window.ti) {
      addLine('> [DEV] window.ti nao disponivel — rode no Electron')
      return
    }
    let resolvedCmd = c.cmd
    if (c.buildCmd && appConfig) {
      try {
        const dynamic = c.buildCmd(appConfig)
        if (dynamic) resolvedCmd = dynamic
      } catch { /* mantem o cmd padrao se o config estiver com formato inesperado */ }
    }

    const id = Date.now().toString()
    activeRunId.current = id
    setRunning(true)
    addLine(`> [${cat.name}] ${c.name}`)

    const uncRoot = appConfig?.network?.softServer
    lastOpenRef.current = (
      uncRoot &&
      typeof resolvedCmd === 'string' &&
      resolvedCmd.toLowerCase().startsWith(String(uncRoot).toLowerCase())
    )
      ? { id, cmd: resolvedCmd, name: c.name, kind: c.type, uncRoot }
      : null

    if (c.type === 'folder' || c.type === 'path') window.ti.runOpenPath(id, resolvedCmd)
    else if (c.type === 'uri') window.ti.runOpenExternal(id, resolvedCmd)
    else window.ti.runOpen(id, resolvedCmd)
  }, [cat, addLine, appConfig])

  const runCmd = useCallback((c) => {
    if (!window.ti) {
      addLine('> [DEV] window.ti nao disponivel — rode no Electron')
      return
    }
    if (c.type === 'script') {
      startScript(c.cmd)
      return
    }
    if (c.type === 'open' || c.type === 'msc' || c.type === 'folder' || c.type === 'path' || c.type === 'uri') {
      startOpen(c)
      return
    }
    const id = Date.now().toString()
    activeRunId.current = id
    setRunning(true)
    addLine(`> [${cat.name}] ${c.name}`)
    if (c.type === 'cmd') {
      window.ti.runCmd(id, c.cmd, c.silent || false)
    }
  }, [cat, addLine, startScript, startOpen])

  const handleRunOrStop = useCallback(() => {
    if (running) {
      stopRunning()
      return
    }
    if (!cmd) return
    if (cmd.dangerous) { setConfirm(cmd); return }
    runCmd(cmd)
  }, [cmd, running, stopRunning, runCmd])

  const handleSelectCategory = useCallback((targetIdx) => {
    if (catIdx === targetIdx) return
    if (cat?.special === 'settings' && settingsDirty) {
      setUnsavedModal({ targetCatIdx: targetIdx })
      return
    }
    setCatIdx(targetIdx)
    setCmdIdx(0)
  }, [catIdx, cat, settingsDirty])

  useEffect(() => {
    categoryItemRefs.current[catIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [catIdx])

  useEffect(() => {
    commandItemRefs.current[cmdIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [catIdx, cmdIdx])

  // ── Teclado ──
  useEffect(() => {
    const handler = (e) => {
      if (confirm || showWmic || credModal || unsavedModal) return
      if (e.key === 'Tab') {
        e.preventDefault()
        const nextIdx = (catIdx + (e.shiftKey ? -1 : 1) + cats.length) % cats.length
        handleSelectCategory(nextIdx)
        return
      }
      if (cat?.special === 'settings' || cat?.special === 'deploy') return
      if (e.key === 'ArrowUp') {
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
  }, [catIdx, cmdIdx, cat, cmd, confirm, showWmic, credModal, unsavedModal, running, cats, handleRunOrStop, handleSelectCategory])

  const togglePin = async () => {
    if (pinPending || !window.ti?.setPin) return
    setPinPending(true)
    try {
      setPinned(await window.ti.setPin(!pinned))
    } finally {
      setPinPending(false)
    }
  }

  const clearTerminal = () => {
    setTermLines([`> terminal limpo — ${new Date().toLocaleTimeString()}`, '> ──────────────────────────────────────────'])
  }

  if (minimized) {
    return (
      <div style={{ ...S.header, borderRadius: 8, border: '1px solid rgba(74,136,255,0.2)' }}>
        <span style={S.headerTitle}>TI DIRECTOR MODE{appVersion ? `  v${appVersion}` : ''}</span>
        <span style={S.headerCounter}>{catIdx+1} / {cats.length}</span>
        <HBtn color={pinned ? '#FFDD44' : '#607080'} onClick={togglePin} title={pinned ? 'Desativar sempre no topo' : 'Manter sempre no topo'} disabled={pinPending} pressed={pinned}>{pinned ? '◆' : '◇'}</HBtn>
        <HBtn onClick={() => { setMinimized(false); window.ti?.setCollapsed(false) }} title="Restaurar">□</HBtn>
        <HBtn color='#FF5566' onClick={() => window.ti?.close()} title="Fechar">✕</HBtn>
      </div>
    )
  }

  return (
    <div style={{ ...S.root, position: 'relative' }}>
      {/* HEADER */}
      <div style={S.header}>
        <span style={S.headerTitle}>TI DIRECTOR MODE{appVersion ? `  v${appVersion}` : ''}</span>
        <span style={S.headerCounter}>{catIdx+1} / {cats.length}</span>
        <div style={{ display:'flex', gap:3, WebkitAppRegion:'no-drag' }}>
          <HBtn color={pinned ? '#FFDD44' : '#607080'} onClick={togglePin} title={pinned ? 'Desativar sempre no topo' : 'Manter sempre no topo'} disabled={pinPending} pressed={pinned}>
            {pinned ? '◆' : '◇'}
          </HBtn>
          <HBtn onClick={() => { setMinimized(true); window.ti?.setCollapsed(true) }} title="Minimizar">_</HBtn>
          <HBtn color='#FF5566' onClick={() => window.ti?.close()} title="Fechar">✕</HBtn>
        </div>
      </div>

      {/* BODY */}
      <div style={S.body}>
        {/* SIDEBAR */}
        <div style={S.sidebar}>
          <div style={S.sidebarLabel}>CATEGORIAS</div>
          <div style={S.categoryList}>
            {cats.map((c, i) => (
              <CatItem key={c.id} cat={c} active={i === catIdx}
                itemRef={node => { categoryItemRefs.current[i] = node }}
                onClick={() => handleSelectCategory(i)} />
            ))}
          </div>
        </div>

        {/* PANEL */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4A8AFF', letterSpacing: 0.5 }}>
              {cat.name}
            </div>
            <div style={{ fontSize: 10, color: '#2A4A6A', marginTop: 1 }}>{cat.sub}</div>
          </div>

          {cat.special === 'settings' ? (
            <SettingsPanel addLine={addLine} onSaved={setAppConfig} onDirtyChange={setSettingsDirty} />
          ) : cat.special === 'deploy' ? (
            <DeployPanel
              appConfig={appConfig}
              addLine={addLine}
              isRunning={running}
              setRunning={setRunning}
              activeRunIdRef={activeRunId}
            />
          ) : (
            <>
              <div style={S.cmdList} ref={cmdListRef}>
                {cat.cmds.map((c, i) => (
                  <CmdItem key={i} cmd={c} selected={i === cmdIdx} index={i}
                    itemRef={node => { commandItemRefs.current[i] = node }}
                    onClick={() => setCmdIdx(i)}
                    onDblClick={() => { setCmdIdx(i); setTimeout(handleRunOrStop, 50) }}
                  />
                ))}
              </div>

              <div style={S.tipBar}>
                {cmd ? `>> ${cmd.tip}` : 'selecione um comando'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TERMINAL */}
      <div style={S.terminal} ref={termRef}>
        {termLines.map((l, i) => <TermLine key={i} line={l} />)}
        <span style={{ display:'inline-block', width:7, height:12, background:'#00BB33', verticalAlign:-2, animation:'blink 1s step-end infinite' }} />
      </div>

      {/* FOOTER */}
      <div style={S.footer}>
        {cat.special !== 'settings' && cat.special !== 'deploy' && (
          <FBtn
            onClick={handleRunOrStop}
            color={running ? '#FF8844' : '#4A8AFF'}
            activeColor={running ? '#FFAA55' : '#6AAAFF'}
            active={running}
          >
            {running ? '■ PARAR' : '▶ EXECUTAR'}
          </FBtn>
        )}
        {cat.special === 'deploy' && running && (
          <FBtn
            onClick={stopRunning}
            color='#FF8844'
            activeColor='#FFAA55'
            active={true}
          >
            ■ PARAR DEPLOY
          </FBtn>
        )}
        <div style={{ flex:1 }} />
        <span style={{ fontSize: 9, color: '#1A2A3A', letterSpacing: 1 }}>
          tab:cat&nbsp;&nbsp;↑↓:cmd&nbsp;&nbsp;enter:exec/parar
        </span>
        <div style={{ flex:1 }} />
        <FBtn onClick={clearTerminal}>CLR</FBtn>
        <FBtn onClick={() => window.ti?.openLog()}>LOG</FBtn>
      </div>

      {/* MODAIS */}
      {unsavedModal && (
        <UnsavedModal
          onStay={() => setUnsavedModal(null)}
          onDiscard={() => {
            const next = unsavedModal.targetCatIdx
            setUnsavedModal(null)
            setSettingsDirty(false)
            setCatIdx(next)
            setCmdIdx(0)
          }}
        />
      )}
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
            if (credModal.mode === 'network') {
              const { uncRoot, pendingCmd } = credModal
              setCredModal(null)
              const id = Date.now().toString()
              pendingAuthRef.current = { cmd: pendingCmd.cmd, kind: pendingCmd.kind }
              activeRunId.current = id
              setRunning(true)
              addLine(`> [${cat.name}] ${pendingCmd.name}`)
              window.ti.authNetworkPath(id, user, password, uncRoot)
            } else {
              const { scriptId } = credModal
              setCredModal(null)
              runScriptNow(scriptId, { user, password })
            }
          }}
          onCancel={() => {
            setCredModal(null)
            setRunning(false)
            activeRunId.current = null
            pendingAuthRef.current = null
            addLine('> cancelado pelo usuario')
          }}
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
