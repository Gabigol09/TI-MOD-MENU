const fs = require('fs')
const path = require('path')

const PENDING_REASON = 'hostname_change'

function validatePendingState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const keys = Object.keys(value)
  const allowed = ['pending', 'expectedHostname', 'reason', 'rebootAfterDeploy']
  if (!keys.every(key => allowed.includes(key))) return null
  if (value.pending !== true || value.reason !== PENDING_REASON) return null
  if (typeof value.expectedHostname !== 'string' || !value.expectedHostname.trim()) return null
  if (value.rebootAfterDeploy !== undefined && typeof value.rebootAfterDeploy !== 'boolean') return null
  return {
    pending: true,
    expectedHostname: value.expectedHostname.trim().toUpperCase(),
    reason: PENDING_REASON,
    rebootAfterDeploy: value.rebootAfterDeploy === true,
  }
}

function createPreparationStateStore(filePath, fileSystem = fs) {
  const persist = state => {
    const validated = validatePendingState(state)
    if (!validated) throw new Error('Estado pendente inválido')
    const temporaryPath = `${filePath}.tmp`
    fileSystem.mkdirSync(path.dirname(filePath), { recursive: true })
    fileSystem.writeFileSync(temporaryPath, JSON.stringify(validated), 'utf8')
    fileSystem.renameSync(temporaryPath, filePath)
    return validated
  }

  return {
    read() {
      try {
        if (!fileSystem.existsSync(filePath)) return null
        const state = validatePendingState(JSON.parse(fileSystem.readFileSync(filePath, 'utf8')))
        return state || { pending: true, invalid: true, reason: PENDING_REASON }
      } catch {
        return { pending: true, invalid: true, reason: PENDING_REASON }
      }
    },
    write(expectedHostname) {
      return persist({ pending: true, expectedHostname, reason: PENDING_REASON, rebootAfterDeploy: false })
    },
    deferUntilAfterDeploy() {
      const current = this.read()
      if (!current || current.invalid) throw new Error('Não existe reinício de hostname pendente')
      return persist({ ...current, rebootAfterDeploy: true })
    },
    clear() {
      try {
        if (fileSystem.existsSync(filePath)) fileSystem.unlinkSync(filePath)
      } catch {}
    },
  }
}

module.exports = { createPreparationStateStore, validatePendingState, PENDING_REASON }
