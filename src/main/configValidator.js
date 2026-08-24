function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addError(errors, field, reason) {
  errors.push({ field, reason })
}

function validateStringFields(section, field, keys, errors) {
  for (const key of keys) {
    if (section[key] !== undefined && typeof section[key] !== 'string') {
      addError(errors, `${field}.${key}`, 'deve ser uma string')
    }
  }
}

function validateDeploy(deploy, errors) {
  if (!Object.prototype.hasOwnProperty.call(deploy, 'categories')) return
  if (!Array.isArray(deploy.categories)) {
    addError(errors, 'deploy.categories', 'deve ser uma lista')
    return
  }

  deploy.categories.forEach((category, categoryIndex) => {
    const field = `deploy.categories[${categoryIndex}]`
    if (!isPlainObject(category)) {
      addError(errors, field, 'deve ser um objeto')
      return
    }

    for (const key of ['id', 'name']) {
      if (typeof category[key] !== 'string' || !category[key].trim()) {
        addError(errors, `${field}.${key}`, 'deve ser uma string não vazia')
      }
    }

    if (category.softwares === undefined) return
    if (!Array.isArray(category.softwares)) {
      addError(errors, `${field}.softwares`, 'deve ser uma lista')
      return
    }

    category.softwares.forEach((software, softwareIndex) => {
      const softwareField = `${field}.softwares[${softwareIndex}]`
      if (!isPlainObject(software)) {
        addError(errors, softwareField, 'deve ser um objeto')
        return
      }

      for (const key of ['id', 'name', 'path']) {
        if (typeof software[key] !== 'string' || !software[key].trim()) {
          addError(errors, `${softwareField}.${key}`, 'deve ser uma string não vazia')
        }
      }

      for (const key of ['type', 'args', 'description']) {
        if (software[key] !== undefined && typeof software[key] !== 'string') {
          addError(errors, `${softwareField}.${key}`, 'deve ser uma string')
        }
      }
    })
  })
}

function validateConfig(config) {
  const errors = []
  if (!isPlainObject(config)) {
    addError(errors, 'config', 'deve ser um objeto JSON')
    return { valid: false, errors }
  }

  const stringSections = {
    company: ['name', 'environment'],
    network: ['softServer', 'softDrive', 'gateway', 'wifiProfile'],
    paths: ['office365', 'office2016', 'office2016Config', 'teams', 'chrome', 'adobeReader', 'pdfCreator', 'greenshot', 'notepadPlusPlus', 'firefox', 'powerBI'],
    hostname: ['pattern', 'patternDescription', 'notebookPrefix'],
    log: ['path', 'dir'],
  }
  for (const [field, keys] of Object.entries(stringSections)) {
    if (config[field] === undefined) continue
    if (!isPlainObject(config[field])) {
      addError(errors, field, 'deve ser um objeto')
      continue
    }
    validateStringFields(config[field], field, keys, errors)
  }

  const drive = config.network?.softDrive
  if (typeof drive === 'string' && drive.trim() && !/^[A-Za-z]:?$/.test(drive.trim())) {
    addError(errors, 'network.softDrive', 'deve conter uma única letra, opcionalmente seguida de dois-pontos')
  }

  const pattern = config.hostname?.pattern
  if (typeof pattern === 'string' && pattern) {
    try {
      new RegExp(pattern)
    } catch (err) {
      addError(errors, 'hostname.pattern', `regex inválida: ${err.message}`)
    }
  }

  if (config.deploy !== undefined) {
    if (!isPlainObject(config.deploy)) addError(errors, 'deploy', 'deve ser um objeto')
    else validateDeploy(config.deploy, errors)
  }

  return { valid: errors.length === 0, errors }
}

function toValidationResponse(result) {
  if (result.valid) return { ok: true, errors: [] }
  const first = result.errors[0]
  return {
    ok: false,
    code: 'INVALID_CONFIG',
    errors: result.errors,
    error: `${first.field}: ${first.reason}`,
  }
}

module.exports = { validateConfig, toValidationResponse, isPlainObject }
