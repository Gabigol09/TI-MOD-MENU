function normalizeConfiguredPath(value) {
  if (typeof value !== 'string') return { ok: false, error: 'Caminho deve ser uma string' }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: '' }
  const startsQuoted = trimmed.startsWith('"')
  const endsQuoted = trimmed.endsWith('"')
  if (startsQuoted !== endsQuoted) return { ok: false, error: 'Caminho contém aspas externas incompletas' }
  if (startsQuoted && endsQuoted) {
    const valueWithoutQuotes = trimmed.slice(1, -1)
    if (!valueWithoutQuotes || valueWithoutQuotes.includes('"')) {
      return { ok: false, error: 'Caminho contém aspas externas inválidas' }
    }
    return { ok: true, value: valueWithoutQuotes }
  }
  return { ok: true, value: trimmed }
}

function normalizeConfigPaths(config) {
  const normalized = JSON.parse(JSON.stringify(config))
  if (normalized.paths && typeof normalized.paths === 'object' && !Array.isArray(normalized.paths)) {
    for (const key of Object.keys(normalized.paths)) {
      const result = normalizeConfiguredPath(normalized.paths[key])
      if (!result.ok) return { ok: false, field: `paths.${key}`, error: result.error }
      normalized.paths[key] = result.value
    }
  }
  if (Array.isArray(normalized.deploy?.categories)) {
    for (let categoryIndex = 0; categoryIndex < normalized.deploy.categories.length; categoryIndex++) {
      const softwares = normalized.deploy.categories[categoryIndex]?.softwares
      if (!Array.isArray(softwares)) continue
      for (let softwareIndex = 0; softwareIndex < softwares.length; softwareIndex++) {
        const result = normalizeConfiguredPath(softwares[softwareIndex]?.path)
        if (!result.ok) {
          return {
            ok: false,
            field: `deploy.categories[${categoryIndex}].softwares[${softwareIndex}].path`,
            error: result.error,
          }
        }
        softwares[softwareIndex].path = result.value
      }
    }
  }
  return { ok: true, config: normalized }
}

module.exports = { normalizeConfiguredPath, normalizeConfigPaths }
