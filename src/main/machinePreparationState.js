const fs = require('fs')
const path = require('path')

const PENDING_REASON = 'hostname_change'

function validatePendingState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (Object.keys(value).length !== 3) return null
  if (value.pending !== true || value.reason !== PENDING_REASON) return null
  if (typeof value.expectedHostname !== 'string' || !value.expectedHostname.trim()) return null
  return {
    pending: true,
    expectedHostname: value.expectedHostname.trim().toUpperCase(),
    reason: PENDING_REASON,
  }
}

function createPreparationStateStore(filePath, fileSystem = fs) {
  return {
    read() {
      try {
        if (!fileSystem.existsSync(filePath)) return null
        return validatePendingState(JSON.parse(fileSystem.readFileSync(filePath, 'utf8')))
      } catch {
        return { pending: true, invalid: true, reason: PENDING_REASON }
      }
    },
    write(expectedHostname) {
      const state = validatePendingState({
        pending: true,
        expectedHostname,
        reason: PENDING_REASON,
      })
      if (!state) throw new Error('Estado pendente inválido')
      const temporaryPath = `${filePath}.tmp`
      fileSystem.mkdirSync(path.dirname(filePath), { recursive: true })
      fileSystem.writeFileSync(temporaryPath, JSON.stringify(state), 'utf8')
      fileSystem.renameSync(temporaryPath, filePath)
      return state
    },
    clear() {
      try {
        if (fileSystem.existsSync(filePath)) fileSystem.unlinkSync(filePath)
      } catch {}
    },
  }
}

module.exports = { createPreparationStateStore, validatePendingState, PENDING_REASON }
