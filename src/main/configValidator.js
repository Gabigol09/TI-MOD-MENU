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
      if (software.defaultForPreparation !== undefined && typeof software.defaultForPreparation !== 'boolean') {
        addError(errors, `${softwareField}.defaultForPreparation`, 'deve ser um booleano')
      }
      if (software.showConsole !== undefined && typeof software.showConsole !== 'boolean') {
        addError(errors, `${softwareField}.showConsole`, 'deve ser um booleano')
      }
    })
  })
}

function validatePreparationAction(actionDef, actionField, errors) {
  if (!isPlainObject(actionDef)) {
    addError(errors, actionField, 'deve ser um objeto')
    return
  }

  const { id, type, action, itemId, blocking } = actionDef

  if (typeof id !== 'string' || !id.trim()) addError(errors, `${actionField}.id`, 'deve ser string não vazia')
  if (blocking !== undefined && typeof blocking !== 'boolean') addError(errors, `${actionField}.blocking`, 'deve ser booleano')

  if (type === 'deploy-item-ref') {
    if (typeof itemId !== 'string' || !itemId.trim()) {
      addError(errors, `${actionField}.itemId`, 'deve ser uma string válida para ref')
    }
    const extraKeys = Object.keys(actionDef).filter(k => !['id', 'type', 'itemId', 'blocking'].includes(k))
    if (extraKeys.length) addError(errors, actionField, `contém campos não esperados: ${extraKeys.join(', ')}`)
    return
  }

  if (type === 'action') {
    const validActions = [
      'sync-time', 'save-power-settings', 'disable-sleep-temporarily', 'restore-power-settings',
      'ensure-directory', 'remove-directory', 'copy-file', 'copy-directory', 'robocopy'
    ]
    if (!validActions.includes(action)) {
      addError(errors, `${actionField}.action`, `ação não mapeada: ${action}`)
      return
    }

    const actionAllowedKeys = {
      'sync-time': [],
      'save-power-settings': [],
      'disable-sleep-temporarily': [],
      'restore-power-settings': [],
      'ensure-directory': ['path'],
      'remove-directory': ['path'],
      'copy-file': ['source', 'destination'],
      'copy-directory': ['source', 'destination'],
      'robocopy': ['source', 'destination', 'args']
    }

    const allowed = ['id', 'type', 'action', 'blocking', ...actionAllowedKeys[action]]
    const extraKeys = Object.keys(actionDef).filter(k => !allowed.includes(k))
    if (extraKeys.length) addError(errors, actionField, `contém campos não esperados para ${action}: ${extraKeys.join(', ')}`)

    // Check required string fields
    for (const k of actionAllowedKeys[action]) {
      if (typeof actionDef[k] !== 'string' || !actionDef[k].trim()) {
        addError(errors, `${actionField}.${k}`, 'deve ser string não vazia')
      }
    }
    return
  }

  addError(errors, `${actionField}.type`, `tipo desconhecido: ${type}`)
}

function validatePreparationProfile(profile, errors, referenceErrors, deployItemIds = new Set()) {
  const ids = new Set()
  const registerId = (id, field) => {
    if (typeof id !== 'string' || !id.trim()) return
    if (ids.has(id)) addError(errors, field, 'ID duplicado no perfil')
    ids.add(id)
  }
  if (profile.enabled !== undefined && typeof profile.enabled !== 'boolean') {
    addError(errors, 'preparationProfile.enabled', 'deve ser um booleano')
  }

  const validProfileKeys = ['enabled', 'choices', 'preDeploy', 'staging', 'postDeploy', 'cleanup']
  const extraKeys = Object.keys(profile).filter(k => !validProfileKeys.includes(k))
  if (extraKeys.length) {
    addError(errors, 'preparationProfile', `contém campos desconhecidos: ${extraKeys.join(', ')}`)
  }

  if (profile.choices !== undefined) {
    if (!Array.isArray(profile.choices)) {
      addError(errors, 'preparationProfile.choices', 'deve ser um array')
    } else {
      profile.choices.forEach((choice, i) => {
        const choiceField = `preparationProfile.choices[${i}]`
        if (!isPlainObject(choice)) {
          addError(errors, choiceField, 'deve ser um objeto')
          return
        }
        if (typeof choice.id !== 'string' || !choice.id.trim()) addError(errors, `${choiceField}.id`, 'deve ser string não vazia')
        else registerId(choice.id, `${choiceField}.id`)
        if (typeof choice.label !== 'string' || !choice.label.trim()) addError(errors, `${choiceField}.label`, 'deve ser string não vazia')
        if (choice.required !== undefined && typeof choice.required !== 'boolean') addError(errors, `${choiceField}.required`, 'deve ser booleano')
        const choiceExtras = Object.keys(choice).filter(key => !['id', 'label', 'required', 'options'].includes(key))
        if (choiceExtras.length) addError(errors, choiceField, `contém campos desconhecidos: ${choiceExtras.join(', ')}`)

        if (!Array.isArray(choice.options)) {
          addError(errors, `${choiceField}.options`, 'deve ser um array')
        } else {
          const optionValues = new Set()
          choice.options.forEach((opt, j) => {
            const optField = `${choiceField}.options[${j}]`
            if (!isPlainObject(opt)) { addError(errors, optField, 'deve ser um objeto'); return }
            if (typeof opt.value !== 'string' || !opt.value.trim()) addError(errors, `${optField}.value`, 'deve ser string não vazia')
            else if (optionValues.has(opt.value)) addError(errors, `${optField}.value`, 'valor duplicado')
            else optionValues.add(opt.value)
            if (typeof opt.label !== 'string' || !opt.label.trim()) addError(errors, `${optField}.label`, 'deve ser string não vazia')
            const optionExtras = Object.keys(opt).filter(key => !['value', 'label', 'deployItems'].includes(key))
            if (optionExtras.length) addError(errors, optField, `contém campos desconhecidos: ${optionExtras.join(', ')}`)
            if (opt.deployItems !== undefined && (!Array.isArray(opt.deployItems) || opt.deployItems.some(di => typeof di !== 'string'))) {
              addError(errors, `${optField}.deployItems`, 'deve ser array de strings')
            } else {
              for (const itemId of opt.deployItems || []) {
                if (!deployItemIds.has(itemId)) addError(referenceErrors, `${optField}.deployItems`, `referência inexistente: ${itemId}`)
              }
            }
          })
        }
      })
    }
  }

  const phases = ['preDeploy', 'staging', 'postDeploy', 'cleanup']
  for (const phase of phases) {
    if (profile[phase] !== undefined) {
      if (!Array.isArray(profile[phase])) {
        addError(errors, `preparationProfile.${phase}`, 'deve ser um array')
      } else {
        profile[phase].forEach((item, index) => {
          const itemField = `preparationProfile.${phase}[${index}]`
          validatePreparationAction(item, itemField, errors)
          if (isPlainObject(item)) {
            registerId(item.id, `${itemField}.id`)
            if (item.type === 'deploy-item-ref' && !deployItemIds.has(item.itemId)) addError(referenceErrors, `${itemField}.itemId`, `referência inexistente: ${item.itemId}`)
          }
        })
      }
    }
  }
}

function validateConfig(config) {
  const errors = []
  const referenceErrors = []
  if (!isPlainObject(config)) {
    addError(errors, 'config', 'deve ser um objeto JSON')
    return { valid: false, errors, referenceErrors }
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

  if (config.preparationProfile !== undefined) {
    if (!isPlainObject(config.preparationProfile)) addError(errors, 'preparationProfile', 'deve ser um objeto')
    else {
      let deployItemIds = new Set()
      if (isPlainObject(config.deploy) && Array.isArray(config.deploy.categories)) {
        deployItemIds = new Set(config.deploy.categories.flatMap(category => isPlainObject(category) && Array.isArray(category.softwares) ? category.softwares.map(item => item.id) : []))
      }
      validatePreparationProfile(config.preparationProfile, errors, referenceErrors, deployItemIds)
    }
  }

  return { valid: errors.length === 0, errors, referenceErrors }
}

function toValidationResponse(result) {
  if (result.valid && result.referenceErrors.length === 0) return { ok: true, errors: [], referenceErrors: [] }
  if (result.valid && result.referenceErrors.length > 0) return { ok: true, needsRepair: true, errors: [], referenceErrors: result.referenceErrors }

  const first = result.errors[0]
  return {
    ok: false,
    code: 'INVALID_CONFIG',
    errors: result.errors,
    referenceErrors: result.referenceErrors,
    error: `${first.field}: ${first.reason}`,
  }
}

module.exports = { validateConfig, toValidationResponse, isPlainObject }
