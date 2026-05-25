import React from 'react'
import styles from '../styles/Sidebar.module.css'

export default function Sidebar({ categories, curCat, onSelect }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.label}>CATEGORIAS</div>
      <nav className={styles.nav}>
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            className={`${styles.item} ${i === curCat ? styles.active : ''}`}
            onClick={() => onSelect(i)}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className={styles.icon}>{cat.icon}</span>
            <span className={styles.name}>{cat.name}</span>
            {i === curCat && <span className={styles.indicator} />}
          </button>
        ))}
      </nav>
    </aside>
  )
}
