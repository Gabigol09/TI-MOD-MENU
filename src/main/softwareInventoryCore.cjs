function cleanString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function comparisonValue(value) {
  return cleanString(value)?.normalize('NFKC').toLocaleLowerCase('en-US') || null
}

function normalizeVersion(value) {
  const display = cleanString(value)
  if (!display) return null
  return display.replace(/^v(?=\d)/i, '').replace(/\s+/g, '').toLocaleLowerCase('en-US')
}

function normalizeSoftwareEntry(raw) {
  const displayName = cleanString(raw?.values?.DisplayName)
  if (!displayName) return null
  const displayVersion = cleanString(raw.values.DisplayVersion)
  const publisher = cleanString(raw.values.Publisher)
  const installLocation = cleanString(raw.values.InstallLocation)
  const registryKey = cleanString(raw.registryKey)
  return {
    displayName,
    displayVersion,
    publisher,
    installLocation,
    source: cleanString(raw.source) || 'unknown',
    scope: raw.scope === 'user' ? 'user' : 'machine',
    architecture: ['32-bit', '64-bit'].includes(raw.architecture) ? raw.architecture : 'unknown',
    registryKey,
    comparison: {
      name: comparisonValue(displayName),
      version: normalizeVersion(displayVersion),
      publisher: comparisonValue(publisher),
      installLocation: comparisonValue(installLocation),
    },
  }
}

function identityKey(item) {
  return [item.comparison.name, item.comparison.version || '', item.comparison.publisher || '', item.scope].join('|')
}

const SOURCE_PRIORITY = { hklm64: 4, hklm32: 3, hkcu64: 2, hkcu32: 1 }

function entryScore(item) {
  return (SOURCE_PRIORITY[item.source] || 0) * 10 + [item.displayVersion, item.publisher, item.installLocation, item.registryKey].filter(Boolean).length
}

function mergeDuplicateEntries(current, candidate) {
  const preferred = entryScore(candidate) > entryScore(current) ? candidate : current
  const fallback = preferred === current ? candidate : current
  const architectures = new Set([current.architecture, candidate.architecture])
  return {
    ...preferred,
    displayVersion: preferred.displayVersion || fallback.displayVersion,
    publisher: preferred.publisher || fallback.publisher,
    installLocation: preferred.installLocation || fallback.installLocation,
    registryKey: preferred.registryKey || fallback.registryKey,
    architecture: architectures.size === 1 ? preferred.architecture : 'multiple',
    sources: [...new Set([...(current.sources || [current.source]), ...(candidate.sources || [candidate.source])])].sort(),
  }
}

function normalizeAndDeduplicate(rawEntries) {
  const map = new Map()
  for (const raw of rawEntries || []) {
    const normalized = normalizeSoftwareEntry(raw)
    if (!normalized) continue
    const key = identityKey(normalized)
    const existing = map.get(key)
    map.set(key, existing ? mergeDuplicateEntries(existing, normalized) : { ...normalized, sources: [normalized.source] })
  }
  return [...map.values()].sort((a, b) => a.comparison.name.localeCompare(b.comparison.name) || (a.comparison.version || '').localeCompare(b.comparison.version || ''))
}

function getCatalogDetection(catalogItem) {
  const detection = catalogItem?.detection
  if (detection && typeof detection === 'object' && !Array.isArray(detection)) {
    return {
      name: comparisonValue(detection.displayName),
      publisher: comparisonValue(detection.publisher),
      version: normalizeVersion(detection.version),
      explicit: true,
    }
  }
  return { name: comparisonValue(catalogItem?.name), publisher: null, version: null, explicit: false }
}

function matchCatalogItem(catalogItem, inventory) {
  const criteria = getCatalogDetection(catalogItem)
  if (!criteria.name) return { status: 'unknown', matches: [], reason: 'INSUFFICIENT_CRITERIA' }

  const nameMatches = (inventory || []).filter(item => item.comparison?.name === criteria.name)
  if (!nameMatches.length) return { status: 'notInstalled', matches: [], reason: 'NO_EXACT_NAME_MATCH' }

  let candidates = nameMatches
  if (criteria.publisher) candidates = candidates.filter(item => item.comparison.publisher === criteria.publisher)
  if (criteria.version) candidates = candidates.filter(item => item.comparison.version === criteria.version)

  if (!candidates.length) {
    const mismatch = criteria.version ? 'VERSION_MISMATCH' : 'PUBLISHER_MISMATCH'
    return { status: criteria.explicit ? 'notInstalled' : 'unknown', matches: [], reason: mismatch }
  }
  if (!criteria.explicit) {
    const publishers = new Set(nameMatches.map(item => item.comparison.publisher).filter(Boolean))
    if (publishers.size > 1) return { status: 'ambiguous', matches: nameMatches, reason: 'MULTIPLE_PUBLISHERS' }
  }
  if (candidates.length > 1) return { status: 'ambiguous', matches: candidates, reason: 'MULTIPLE_MATCHES' }
  return { status: 'installed', matches: candidates, reason: 'EXACT_MATCH' }
}

module.exports = {
  cleanString,
  comparisonValue,
  normalizeVersion,
  normalizeSoftwareEntry,
  normalizeAndDeduplicate,
  matchCatalogItem,
}
