import React, { useRef } from 'react'
import styles from '../styles/Header.module.css'

export default function Header({ pinned, onPin, onCollapse, onClose, collapsed, catIndex, catTotal, appVersion }) {
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 })

  const onMouseDown = (e) => {
    if (e.target.closest('button')) return
    dragRef.current = { dragging: true, lastX: e.screenX, lastY: e.screenY }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return
    const dx = e.screenX - dragRef.current.lastX
    const dy = e.screenY - dragRef.current.lastY
    dragRef.current.lastX = e.screenX
    dragRef.current.lastY = e.screenY
    window.ti?.drag(dx, dy)
  }

  const onMouseUp = () => {
    dragRef.current.dragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  return (
    <header className={styles.header} onMouseDown={onMouseDown}>
      <div className={styles.left}>
        <span className={styles.logo}>TI</span>
        <span className={styles.title}>DIRECTOR MODE</span>
        {appVersion && <span className={styles.version}>v{appVersion}</span>}
      </div>

      <div className={styles.center}>
        {!collapsed && (
          <span className={styles.counter}>{catIndex + 1} / {catTotal}</span>
        )}
      </div>

      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.btnPin} ${pinned ? styles.active : ''}`}
          onClick={onPin}
          title={pinned ? 'Desfixar janela' : 'Fixar janela (sempre no topo)'}
        >
          {pinned ? '📌' : '📍'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnCollapse}`}
          onClick={onCollapse}
          title={collapsed ? 'Expandir' : 'Minimizar'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnClose}`}
          onClick={onClose}
          title="Fechar"
        >
          ✕
        </button>
      </div>
    </header>
  )
}
