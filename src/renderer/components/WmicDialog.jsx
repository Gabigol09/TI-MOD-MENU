import React, { useState, useEffect, useRef } from 'react'
import styles from '../styles/WmicDialog.module.css'

export default function WmicDialog({ onInstall, onSkip, log }) {
  const [installing, setInstalling]   = useState(false)
  const [progress, setProgress]       = useState(0)
  const [status, setStatus]           = useState('')
  const [done, setDone]               = useState(false)
  const [failed, setFailed]           = useState(false)
  const resultPathRef                  = useRef(null)
  const startTickRef                   = useRef(null)
  const timerRef                       = useRef(null)

  const handleInstall = async () => {
    setInstalling(true)
    startTickRef.current = Date.now()
    log('> iniciando instalacao do WMIC via DISM...', 'info')

    const resultPath = await window.ti?.installWmic()
    resultPathRef.current = resultPath

    // Poll a cada 1.5s
    timerRef.current = setInterval(() => tick(), 1500)
  }

  const tick = async () => {
    const elapsed = Date.now() - startTickRef.current
    const maxMs   = 300_000  // 5 min

    // Progresso logarítmico baseado no tempo
    const raw = 100 * (1 - Math.exp(-elapsed / 90000))
    const pct = Math.min(Math.round(raw), 94)
    setProgress(pct)

    // Mensagens progressivas
    if      (elapsed < 15000)  setStatus('Inicializando DISM...')
    else if (elapsed < 60000)  setStatus('Baixando pacote WMIC...')
    else if (elapsed < 150000) setStatus('Instalando componentes...')
    else if (elapsed < 240000) setStatus('Finalizando instalacao...')
    else                       setStatus('Aguardando conclusao...')

    // Verificar resultado
    const result = await window.ti?.checkWmicResult(resultPathRef.current)

    if (result === 'ok') {
      clearInterval(timerRef.current)
      setProgress(100)
      setStatus('WMIC instalado com sucesso!')
      setDone(true)
      log(`> WMIC instalado em ${Math.round(elapsed / 1000)}s — reinicie para ativar`, 'ok')
      setTimeout(() => onInstall(), 2000)
    } else if (result === 'fail') {
      clearInterval(timerRef.current)
      setFailed(true)
      setStatus('Instalacao falhou — tente manualmente')
      log('> WMIC: falha — Configuracoes > Apps > Recursos opcionais > WMIC', 'error')
    } else if (elapsed > 480000) {
      clearInterval(timerRef.current)
      setFailed(true)
      setStatus('Timeout — verificar manualmente')
      log('> WMIC: timeout na instalacao', 'warn')
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <span className={styles.icon}>⚠</span>
          <span className={styles.title}>WMIC não encontrado</span>
        </div>

        {!installing ? (
          <>
            <p className={styles.lead}>
              O WMIC melhora o funcionamento do programa neste computador:
            </p>
            <ul className={styles.benefits}>
              <li>+ Serial BIOS mais preciso</li>
              <li>+ Device ID (UUID) nativo</li>
              <li>+ Info de GPU e monitores</li>
              <li>+ Desinstalar programas via menu</li>
            </ul>
            <div className={styles.warning}>
              <span>⏱</span>
              <span>Tempo estimado: 2 a 5 minutos</span>
            </div>
            <div className={styles.warning}>
              <span>ℹ</span>
              <span>O programa continua funcionando durante a instalação</span>
            </div>
            <p className={styles.skip}>
              Sem WMIC: comandos alternativos já foram aplicados. Funcionalidade levemente reduzida.
            </p>
            <div className={styles.btns}>
              <button className={styles.btnPrimary} onClick={handleInstall}>
                HABILITAR WMIC (~2-5 min)
              </button>
              <button className={styles.btnSecondary} onClick={onSkip}>
                Continuar sem WMIC
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              {done ? '✓ Instalação concluída!' : failed ? '✕ Falha na instalação' : 'Instalando WMIC via DISM...'}
            </p>

            <div className={styles.progressWrap}>
              <div
                className={`${styles.progressBar} ${done ? styles.done : ''} ${failed ? styles.fail : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className={styles.progressInfo}>
              <span className={`${styles.statusText} ${failed ? styles.errorText : ''} ${done ? styles.okText : ''}`}>
                {status}
              </span>
              <span className={styles.pct}>{progress}%</span>
            </div>

            {!done && !failed && (
              <p className={styles.hint}>
                O programa continua funcionando normalmente durante a instalação.
              </p>
            )}

            {failed && (
              <p className={styles.hint} style={{ color: 'var(--text-orange)' }}>
                Acesse: Configurações → Apps → Recursos opcionais → WMIC
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
