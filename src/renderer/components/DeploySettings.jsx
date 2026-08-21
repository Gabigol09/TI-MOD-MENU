import { useState, useCallback } from 'react'

const inputStyle = {
  width: '100%', padding: '6px 8px', borderRadius: 3, boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.4)', border: '1px solid #1A2A3A', color: '#DDE8FF',
  fontFamily: 'var(--font-mono)', fontSize: 11,
}
const labelStyle = { color: '#7A9ABB', fontSize: 10, marginBottom: 3, display: 'block' }
const btnStyle = {
  padding: '4px 10px', borderRadius: 3, fontSize: 10.5, whiteSpace: 'nowrap',
  background: 'rgba(74,136,255,0.12)', color: '#6AAAFF',
  border: '1px solid rgba(74,136,255,0.3)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
}
const delBtnStyle = {
  padding: '4px 8px', borderRadius: 3, fontSize: 10, whiteSpace: 'nowrap',
  background: 'rgba(255,68,85,0.1)', color: '#FF6677',
  border: '1px solid rgba(255,68,85,0.25)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
}

export default function DeploySettings({ cfg, onChange, addLine }) {
  const categories = cfg?.deploy?.categories || []

  // Modal / Formulário de Software
  const [editingSoftware, setEditingSoftware] = useState(null)
  // Estado: { isNew: boolean, catId: string, item: { id, name, type, path, args, description } }

  // Modal / Edição de Categoria
  const [editingCat, setEditingCat] = useState(null)
  // Estado: { isNew: boolean, id?: string, name: string }

  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  // ── Atualização de categorias no cfg ──
  const updateCategories = useCallback((newCats) => {
    onChange(['deploy', 'categories'], newCats)
  }, [onChange])

  // ── Ações de Categorias ──
  const handleSaveCat = () => {
    if (!editingCat?.name?.trim()) return
    const name = editingCat.name.trim()
    if (editingCat.isNew) {
      const newId = `cat-${Date.now()}`
      const newCats = [...categories, { id: newId, name, softwares: [] }]
      updateCategories(newCats)
      addLine?.(`> [Deploy Config] Categoria criada: ${name}`)
    } else {
      const newCats = categories.map(c => c.id === editingCat.id ? { ...c, name } : c)
      updateCategories(newCats)
      addLine?.(`> [Deploy Config] Categoria renomeada: ${name}`)
    }
    setEditingCat(null)
  }

  const handleDeleteCat = (catId, catName) => {
    if (!window.confirm(`Deseja realmente excluir a categoria "${catName}" e todos os softwares nela cadastrados?`)) return
    const newCats = categories.filter(c => c.id !== catId)
    updateCategories(newCats)
    addLine?.(`> [Deploy Config] Categoria removida: ${catName}`)
  }

  const handleMoveCat = (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= categories.length) return
    const newCats = [...categories]
    const temp = newCats[index]
    newCats[index] = newCats[targetIdx]
    newCats[targetIdx] = temp
    updateCategories(newCats)
  }

  // ── Ações de Softwares ──
  const handleOpenAddSoftware = (catId) => {
    setTestResult(null)
    setEditingSoftware({
      isNew: true,
      catId: catId || categories[0]?.id || '',
      item: {
        id: `soft-${Date.now()}`,
        name: '',
        type: 'executable',
        path: '',
        args: '',
        description: '',
      }
    })
  }

  const handleOpenEditSoftware = (catId, soft) => {
    setTestResult(null)
    setEditingSoftware({
      isNew: false,
      catId,
      item: { ...soft }
    })
  }

  const handleTestSoftwarePath = async (path) => {
    if (!path?.trim()) {
      setTestResult({ exists: false, error: 'Caminho não informado' })
      return
    }
    setTesting(true)
    const res = await window.ti?.testPath(path.trim())
    setTesting(false)
    setTestResult(res || { exists: false, error: 'Sem resposta do sistema' })
  }

  const handleSaveSoftware = () => {
    if (!editingSoftware?.item?.name?.trim() || !editingSoftware?.item?.path?.trim()) {
      alert('Nome e Caminho do software são obrigatórios.')
      return
    }

    const { isNew, catId, item } = editingSoftware
    const cleanItem = {
      ...item,
      name: item.name.trim(),
      path: item.path.trim(),
      args: item.args?.trim() || '',
      description: item.description?.trim() || '',
    }

    let newCats = categories.map(c => ({ ...c, softwares: [...(c.softwares || [])] }))

    if (isNew) {
      newCats = newCats.map(c => {
        if (c.id === catId) {
          return { ...c, softwares: [...c.softwares, cleanItem] }
        }
        return c
      })
      addLine?.(`> [Deploy Config] Software adicionado: ${cleanItem.name}`)
    } else {
      // Remove de qualquer categoria antiga e insere na categoria selecionada
      newCats = newCats.map(c => ({
        ...c,
        softwares: c.softwares.filter(s => s.id !== cleanItem.id)
      }))
      newCats = newCats.map(c => {
        if (c.id === catId) {
          return { ...c, softwares: [...c.softwares, cleanItem] }
        }
        return c
      })
      addLine?.(`> [Deploy Config] Software atualizado: ${cleanItem.name}`)
    }

    updateCategories(newCats)
    setEditingSoftware(null)
  }

  const handleDeleteSoftware = (catId, softId, softName) => {
    if (!window.confirm(`Deseja remover o software "${softName}" do catálogo?`)) return
    const newCats = categories.map(c => {
      if (c.id === catId) {
        return { ...c, softwares: c.softwares.filter(s => s.id !== softId) }
      }
      return c
    })
    updateCategories(newCats)
    addLine?.(`> [Deploy Config] Software removido: ${softName}`)
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* HEADER DEPLOY CONFIG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: '#4A8AFF', fontSize: 12, fontWeight: 600 }}>Catálogo de Deploy</div>
          <div style={{ color: '#6A8AA8', fontSize: 10 }}>Gerencie categorias e softwares configuráveis para instalação</div>
        </div>
        <button
          style={{ ...btnStyle, background: 'rgba(74,136,255,0.2)' }}
          onClick={() => setEditingCat({ isNew: true, name: '' })}
        >
          + Nova Categoria
        </button>
      </div>

      {/* MODAL / FORM DE CATEGORIA */}
      {editingCat && (
        <div style={{
          background: 'rgba(15, 25, 40, 0.95)', border: '1px solid rgba(74,136,255,0.4)',
          borderRadius: 4, padding: 12, marginBottom: 14,
        }}>
          <div style={{ color: '#DDE8FF', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
            {editingCat.isNew ? 'Nova Categoria' : 'Editar Categoria'}
          </div>
          <label style={labelStyle}>Nome da Categoria</label>
          <input
            style={{ ...inputStyle, marginBottom: 8 }}
            value={editingCat.name}
            onChange={e => setEditingCat(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Softwares Básicos, Opcionais, Engenharia..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={{ ...btnStyle, color: '#8899AA' }} onClick={() => setEditingCat(null)}>Cancelar</button>
            <button style={btnStyle} onClick={handleSaveCat}>Salvar Categoria</button>
          </div>
        </div>
      )}

      {/* MODAL / FORM DE SOFTWARE */}
      {editingSoftware && (
        <div style={{
          background: 'rgba(15, 25, 40, 0.98)', border: '1px solid rgba(74,136,255,0.5)',
          borderRadius: 6, padding: 14, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
        }}>
          <div style={{ color: '#6AAAFF', fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>
            {editingSoftware.isNew ? '➕ Adicionar Software' : '✏️ Editar Software'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Nome do Software *</label>
              <input
                style={inputStyle}
                value={editingSoftware.item.name}
                onChange={e => setEditingSoftware(prev => ({ ...prev, item: { ...prev.item, name: e.target.value } }))}
                placeholder="Ex: Google Chrome"
              />
            </div>
            <div>
              <label style={labelStyle}>Categoria *</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editingSoftware.catId}
                onChange={e => setEditingSoftware(prev => ({ ...prev, catId: e.target.value }))}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#0A121E', color: '#DDE8FF' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Tipo de Execução</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editingSoftware.item.type || 'executable'}
                onChange={e => setEditingSoftware(prev => ({ ...prev, item: { ...prev.item, type: e.target.value } }))}
              >
                <option value="executable" style={{ background: '#0A121E', color: '#DDE8FF' }}>Executável (.exe / .msi)</option>
                <option value="script" style={{ background: '#0A121E', color: '#DDE8FF' }}>Script (.cmd / .bat)</option>
                <option value="open" style={{ background: '#0A121E', color: '#DDE8FF' }}>Abrir arquivo (Shell)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Argumentos (opcional)</label>
              <input
                style={inputStyle}
                value={editingSoftware.item.args || ''}
                onChange={e => setEditingSoftware(prev => ({ ...prev, item: { ...prev.item, args: e.target.value } }))}
                placeholder="Ex: /silent /install ou /qn"
              />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Caminho do Instalador / Arquivo (UNC ou Local) *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={editingSoftware.item.path}
                onChange={e => setEditingSoftware(prev => ({ ...prev, item: { ...prev.item, path: e.target.value } }))}
                placeholder="\\servidor\soft\App\setup.exe ou C:\Deploy\setup.exe"
              />
              <button
                style={btnStyle}
                onClick={() => handleTestSoftwarePath(editingSoftware.item.path)}
                disabled={testing}
              >
                {testing ? 'Testando...' : 'Testar'}
              </button>
            </div>
            {testResult?.exists === true && (
              <div style={{ color: '#00CC44', fontSize: 10, marginTop: 3 }}>✓ caminho encontrado e acessível</div>
            )}
            {testResult && testResult.exists !== true && (
              <div style={{ color: '#FF5555', fontSize: 10, marginTop: 3 }}>
                ✗ {testResult.error || 'caminho não encontrado ou inacessível'}
              </div>
            )}
            {(() => {
              const ext = (editingSoftware.item.path || '').trim().split('.').pop()?.toLowerCase() || ''
              const nonExec = new Set(['txt', 'png', 'jpg', 'jpeg', 'pdf', 'zip', 'rar', '7z', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'iso', 'xml', 'json', 'log'])
              if (editingSoftware.item.type === 'executable' && nonExec.has(ext)) {
                return (
                  <div style={{
                    background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.35)',
                    borderRadius: 3, padding: '6px 8px', marginTop: 6, fontSize: 10, color: '#FFCC66', lineHeight: 1.4,
                  }}>
                    ⚠️ <b>Atenção:</b> Arquivos <code>.{ext}</code> não são executáveis pelo CMD. Para abrir este arquivo com o programa padrão do Windows, altere o <b>Tipo de Execução</b> acima para <b>Abrir arquivo (Shell)</b>.
                  </div>
                )
              }
              return null
            })()}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Descrição (opcional)</label>
            <input
              style={inputStyle}
              value={editingSoftware.item.description || ''}
              onChange={e => setEditingSoftware(prev => ({ ...prev, item: { ...prev.item, description: e.target.value } }))}
              placeholder="Ex: Navegador padrão para todas as máquinas"
            />
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button style={{ ...btnStyle, color: '#8899AA' }} onClick={() => setEditingSoftware(null)}>Cancelar</button>
            <button style={{ ...btnStyle, background: 'rgba(74,136,255,0.25)' }} onClick={handleSaveSoftware}>
              Salvar Software
            </button>
          </div>
        </div>
      )}

      {/* LISTAGEM DE CATEGORIAS E SOFTWARES */}
      {categories.length === 0 ? (
        <div style={{ color: '#6A8AA8', fontSize: 11, padding: 16, textAlign: 'center' }}>
          Nenhuma categoria cadastrada. Clique em <b>+ Nova Categoria</b> acima para começar.
        </div>
      ) : (
        categories.map((cat, catIdx) => (
          <div
            key={cat.id}
            style={{
              background: 'rgba(10, 18, 30, 0.5)', border: '1px solid rgba(74,136,255,0.15)',
              borderRadius: 4, marginBottom: 12, padding: 10,
            }}
          >
            {/* Linha da Categoria */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#4A8AFF', fontWeight: 600, fontSize: 11.5 }}>{cat.name}</span>
                <span style={{ color: '#557090', fontSize: 10 }}>({(cat.softwares || []).length} softwares)</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  style={{ ...btnStyle, padding: '2px 6px', fontSize: 9.5 }}
                  onClick={() => handleMoveCat(catIdx, -1)}
                  disabled={catIdx === 0}
                  title="Mover para cima"
                >▲</button>
                <button
                  style={{ ...btnStyle, padding: '2px 6px', fontSize: 9.5 }}
                  onClick={() => handleMoveCat(catIdx, 1)}
                  disabled={catIdx === categories.length - 1}
                  title="Mover para baixo"
                >▼</button>
                <button
                  style={{ ...btnStyle, padding: '2px 6px', fontSize: 9.5 }}
                  onClick={() => setEditingCat({ isNew: false, id: cat.id, name: cat.name })}
                >Renomear</button>
                <button
                  style={{ ...btnStyle, padding: '2px 8px', fontSize: 9.5, background: 'rgba(74,136,255,0.2)' }}
                  onClick={() => handleOpenAddSoftware(cat.id)}
                >+ Software</button>
                <button
                  style={{ ...delBtnStyle, padding: '2px 6px' }}
                  onClick={() => handleDeleteCat(cat.id, cat.name)}
                  title="Excluir categoria"
                >✕</button>
              </div>
            </div>

            {/* Softwares da Categoria */}
            {(cat.softwares || []).length === 0 ? (
              <div style={{ color: '#445566', fontSize: 10, padding: '6px 8px' }}>
                Nenhum software nesta categoria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cat.softwares.map(soft => (
                  <div
                    key={soft.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(0,0,0,0.25)', border: '1px solid #142232',
                      borderRadius: 3, padding: '5px 8px', fontSize: 10.5,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#DDE8FF', fontWeight: 500 }}>{soft.name}</span>
                        <span style={{
                          fontSize: 9, padding: '1px 4px', borderRadius: 2,
                          background: 'rgba(74,136,255,0.1)', color: '#6AAAFF',
                        }}>
                          {soft.type === 'script' ? 'SCRIPT' : soft.type === 'open' ? 'SHELL' : 'EXE/MSI'}
                        </span>
                      </div>
                      <div style={{ color: '#6A8AA8', fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {soft.path} {soft.args ? `[${soft.args}]` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        style={{ ...btnStyle, padding: '2px 6px', fontSize: 9.5 }}
                        onClick={() => handleOpenEditSoftware(cat.id, soft)}
                      >Editar</button>
                      <button
                        style={{ ...delBtnStyle, padding: '2px 6px' }}
                        onClick={() => handleDeleteSoftware(cat.id, soft.id, soft.name)}
                        title="Remover software"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
