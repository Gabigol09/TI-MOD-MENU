import React from 'react'
import styles from '../styles/CommandPanel.module.css'

export default function CommandPanel({ category, curCmd, onSelect, onExecute }) {
  if (!category) return null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.catName}>{category.name}</span>
        <span className={styles.catSub}>{category.sub}</span>
      </div>

      <div className={styles.list}>
        {category.cmds.map((cmd, i) => (
          <div
            key={i}
            className={`
              ${styles.item}
              ${i === curCmd ? styles.selected : ''}
              ${cmd.danger ? styles.danger : ''}
              ${cmd._fallback ? styles.fallback : ''}
            `}
            onClick={() => onSelect(i)}
            onDoubleClick={() => onExecute(i)}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className={styles.itemLeft}>
              <span className={styles.name}>{cmd.name}</span>
              <span className={styles.desc}>{cmd.desc}</span>
            </div>
            <div className={styles.itemRight}>
              {cmd.danger && <span className={styles.badge} data-type="danger">!</span>}
              {cmd._fallback && <span className={styles.badge} data-type="fallback">~</span>}
              <span className={styles.typeBadge}>{cmd.type}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tip da linha selecionada */}
      <div className={styles.tip}>
        <span className={styles.tipArrow}>&gt;&gt;</span>
        <span className={styles.tipText}>
          {category.cmds[curCmd]?.tip ?? 'selecione um comando'}
        </span>
      </div>
    </div>
  )
}
