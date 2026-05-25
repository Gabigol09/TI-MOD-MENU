import React, { useEffect, useRef } from 'react'
import styles from '../styles/Terminal.module.css'

const TYPE_CLASS = {
  default: '',
  info:    'lineInfo',
  ok:      'lineOk',
  warn:    'lineWarn',
  error:   'lineError',
  dim:     'lineDim',
  cmd:     'lineCmd',
  output:  'lineOutput',
}

export default function Terminal({ lines, onClear, onOpenLog }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className={styles.terminal}>
      <div className={styles.topbar}>
        <span className={styles.termLabel}>● TERMINAL</span>
        <div className={styles.termBtns}>
          <button className={styles.termBtn} onClick={onClear} title="Limpar terminal">CLR</button>
          <button className={styles.termBtn} onClick={onOpenLog} title="Abrir log em arquivo">LOG</button>
        </div>
      </div>

      <div className={styles.output}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${styles.line} ${styles[TYPE_CLASS[line.type] ?? '']}`}
          >
            {line.text}
          </div>
        ))}
        <div className={styles.cursor}>
          <span className={styles.prompt}>C:\TI\&gt; </span>
          <span className={styles.blink}>█</span>
        </div>
        <div ref={endRef} />
      </div>
    </div>
  )
}
