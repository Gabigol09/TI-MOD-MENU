const REGISTRY = {
  'diagnostico.hostname': {
    strategy: 'cmd',
    cmd: 'hostname',
  },
  'rede.ipconfig-all': {
    strategy: 'cmd',
    cmd: 'ipconfig /all',
  },
  'rede.flush-dns': {
    strategy: 'cmd',
    cmd: 'ipconfig /flushdns',
  },
  'rede.list-mappings': {
    strategy: 'cmd',
    cmd: 'net use',
  },
  'diagnostico.systeminfo': {
    strategy: 'cmd',
    cmd: 'systeminfo',
  },
}

const VALID_STRATEGIES = new Set(['cmd'])

function validateExecutionRequest(request) {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) {
    return { ok: false, error: 'requisicao deve ser um objeto' }
  }

  const unexpected = Object.keys(request).filter(key => key !== 'commandId' && key !== 'payload')
  if (unexpected.length) {
    return { ok: false, error: `campos inesperados: ${unexpected.join(', ')}` }
  }

  return resolveCommand(request.commandId, request.payload)
}

function resolveCommand(commandId, payload) {
  if (typeof commandId !== 'string' || !commandId) {
    return { ok: false, error: 'commandId deve ser uma string não vazia' }
  }

  const entry = REGISTRY[commandId]
  if (!entry) {
    return { ok: false, error: `commandId desconhecido: ${commandId}` }
  }

  if (!VALID_STRATEGIES.has(entry.strategy)) {
    return { ok: false, error: `estrategia invalida para ${commandId}` }
  }

  if (payload !== undefined && payload !== null && typeof payload === 'object' && Object.keys(payload).length > 0) {
    return { ok: false, error: `commandId ${commandId} nao aceita payload` }
  }

  return {
    ok: true,
    commandId,
    strategy: entry.strategy,
    cmd: entry.cmd,
  }
}

function listRegistered() {
  return Object.keys(REGISTRY)
}

module.exports = { resolveCommand, validateExecutionRequest, listRegistered, REGISTRY }
