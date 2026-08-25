import { useEffect, useState } from 'react'

const buttonStyle = (color, disabled) => ({
  background: disabled ? '#18202A' : `${color}22`,
  border: `1px solid ${disabled ? '#303844' : color}`,
  color: disabled ? '#607080' : color,
  borderRadius: 4,
  padding: '7px 12px',
  fontSize: 10,
  cursor: disabled ? 'default' : 'pointer',
})

export default function MachinePreparationModal({ initialStatus, onClose, onStatusChange, addLine }) {
  const [status, setStatus] = useState(initialStatus)
  const [hostname, setHostname] = useState('')
  const [validation, setValidation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmRename, setConfirmRename] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)

  useEffect(() => setStatus(initialStatus), [initialStatus])

  const validate = async () => {
    setBusy(true)
    try {
      setValidation(await window.ti.validateMachineHostname(hostname))
    } finally {
      setBusy(false)
    }
  }

  const rename = async () => {
    setBusy(true)
    try {
      const result = await window.ti.renameMachineHostname(hostname)
      setValidation(result)
      if (result.ok) {
        const next = { ...status, blocked: true, pending: true, expectedHostname: result.expectedHostname, validation: null }
        setStatus(next)
        onStatusChange(next)
        setConfirmRename(false)
        addLine(`> hostname alterado para ${result.expectedHostname}; reinício obrigatório`)
      }
    } finally {
      setBusy(false)
    }
  }

  const restart = async () => {
    setBusy(true)
    try {
      const result = await window.ti.restartMachine()
      if (!result.ok) {
        setValidation(result)
        setConfirmRestart(false)
        addLine(`> [ERR] reinício não executado: ${result.error}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const mismatch = status?.validation?.status === 'mismatch'
  const configError = ['invalid-pattern', 'disabled'].includes(status?.validation?.status)
  const unavailable = status?.validation?.status === 'unavailable'
  const approved = status?.validation?.status === 'match' && !status?.blocked

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,7,14,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 12 }}>
      <div style={{ width: 'min(440px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: '#09111D', border: '1px solid #315A85', borderRadius: 7, padding: 18, boxShadow: '0 12px 40px #000' }}>
        <div style={{ color: '#6AAAFF', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Preparar Máquina — Hostname</div>
        <div style={{ color: '#7890A8', fontSize: 10, marginBottom: 4 }}>Hostname atual</div>
        <div style={{ color: '#D8E8F8', fontSize: 13, marginBottom: 12 }}>{status?.hostname || '(indisponível)'}</div>

        {status?.pending && (
          <>
            <div style={{ color: '#FFBB44', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Reinício obrigatório</div>
            <div style={{ color: '#A8B8C8', fontSize: 10.5, lineHeight: 1.5, marginBottom: 12 }}>
              A preparação está bloqueada até que o Windows reinicie e o hostname ativo seja <strong>{status.expectedHostname || '(estado inválido)'}</strong>.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={busy} style={buttonStyle('#FFBB44', busy)} onClick={() => setConfirmRestart(true)}>Reiniciar agora</button>
              <button disabled={busy} style={buttonStyle('#7890A8', busy)} onClick={onClose}>Cancelar preparação</button>
            </div>
          </>
        )}

        {approved && (
          <>
            <div style={{ color: '#33CC66', fontSize: 12, marginBottom: 12 }}>Hostname válido. O preflight foi aprovado.</div>
            {status.resumed && <div style={{ color: '#7890A8', fontSize: 10, marginBottom: 12 }}>A alteração pendente foi confirmada pelo hostname real e o bloqueio foi removido.</div>}
            <button style={buttonStyle('#33CC66', false)} onClick={onClose}>Concluir preflight</button>
          </>
        )}

        {(mismatch || configError || unavailable) && !status?.pending && (
          <>
            <div style={{ color: mismatch ? '#FFBB44' : '#FF5566', fontSize: 12, marginBottom: 8 }}>
              {mismatch ? 'Hostname fora do padrão' : configError ? 'Configuração de hostname inválida' : 'Não foi possível obter o hostname'}
            </div>
            <div style={{ color: '#7890A8', fontSize: 10, marginBottom: 4 }}>Formato esperado</div>
            <div style={{ color: '#B8C8D8', fontSize: 11, marginBottom: 12 }}>{status.expectedFormat || '(não configurado)'}</div>
            {mismatch && status?.elevated === false && (
              <>
                <div style={{ color: '#FF5566', fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>
                  Privilégios de Administrador são necessários. A correção automática do hostname não está disponível sem elevação.
                </div>
                <button disabled={busy} style={buttonStyle('#7890A8', busy)} onClick={onClose}>Voltar</button>
              </>
            )}
            {mismatch && status?.elevated !== false && (
              <>
                <input value={hostname} onChange={event => { setHostname(event.target.value); setValidation(null); setConfirmRename(false) }} placeholder="Novo hostname" maxLength={15} disabled={busy} style={{ width: '100%', boxSizing: 'border-box', background: '#050A11', border: '1px solid #294866', color: '#D8E8F8', borderRadius: 4, padding: 8, fontSize: 11, marginBottom: 8 }} />
                {validation && <div style={{ color: validation.ok ? '#33CC66' : '#FF5566', fontSize: 10, marginBottom: 8 }}>{validation.ok ? 'Novo hostname válido' : validation.error}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  {!validation?.ok && <button disabled={busy || !hostname.trim()} style={buttonStyle('#4A8AFF', busy || !hostname.trim())} onClick={validate}>Validar hostname</button>}
                  {validation?.ok && !confirmRename && <button disabled={busy} style={buttonStyle('#FFBB44', busy)} onClick={() => setConfirmRename(true)}>Alterar hostname</button>}
                  <button disabled={busy} style={buttonStyle('#7890A8', busy)} onClick={onClose}>Cancelar preparação</button>
                </div>
              </>
            )}
            {!mismatch && <button style={buttonStyle('#7890A8', false)} onClick={onClose}>Fechar</button>}
          </>
        )}

        {confirmRename && (
          <div style={{ marginTop: 14, borderTop: '1px solid #294866', paddingTop: 12 }}>
            <div style={{ color: '#FFBB44', fontSize: 11, marginBottom: 10 }}>Confirmar alteração para {validation.hostname}? A continuação ficará bloqueada até o reboot.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={busy} style={buttonStyle('#FFBB44', busy)} onClick={rename}>Confirmar alteração</button>
              <button disabled={busy} style={buttonStyle('#7890A8', busy)} onClick={() => setConfirmRename(false)}>Voltar</button>
            </div>
          </div>
        )}

        {confirmRestart && (
          <div style={{ marginTop: 14, borderTop: '1px solid #294866', paddingTop: 12 }}>
            <div style={{ color: '#FFBB44', fontSize: 11, marginBottom: 10 }}>Confirmar reinício imediato do Windows?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={busy} style={buttonStyle('#FF5566', busy)} onClick={restart}>Confirmar reinício</button>
              <button disabled={busy} style={buttonStyle('#7890A8', busy)} onClick={() => setConfirmRestart(false)}>Voltar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
