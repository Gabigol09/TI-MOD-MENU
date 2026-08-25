import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import iconv from 'iconv-lite'
import processRunner from '../src/main/processRunner.js'

function createProcess() {
  const proc = new EventEmitter()
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.pid = 123
  proc.killed = false
  return proc
}

function runWithExit(code, stderr = '') {
  const proc = createProcess()
  const spawnProcess = vi.fn(() => proc)
  const promise = processRunner.runDeployItemTracked(null, `deploy-${code}`, { name: 'Aplicativo', path: 'C:\\Pacotes\\app.exe', type: 'executable' }, spawnProcess)
  if (stderr) proc.stderr.emit('data', Buffer.from(stderr))
  proc.emit('close', code)
  return { promise, spawnProcess }
}

describe('deploy process runner', () => {
  it('mantém processo longo pendente até o evento close', async () => {
    const proc = createProcess()
    const promise = processRunner.runDeployItemTracked(null, 'deploy-long', { name: 'Teste longo', path: 'C:\\Pacotes\\deploy teste.bat', args: '--modo teste', type: 'script' }, vi.fn(() => proc))
    let settled = false
    promise.then(() => { settled = true })
    proc.stdout.emit('data', Buffer.from('Etapa 1 de 120\r\n'))
    await Promise.resolve()
    expect(settled).toBe(false)
    proc.emit('close', 0)
    await expect(promise).resolves.toEqual({ ok: true, code: 0 })
  })

  it('cria o processo antes de registrar listeners e conclui sem ReferenceError', async () => {
    const { promise, spawnProcess } = runWithExit(0)
    await expect(promise).resolves.toEqual({ ok: true, code: 0 })
    expect(spawnProcess).toHaveBeenCalledWith('cmd.exe', ['/d', '/s', '/c', '""C:\\Pacotes\\app.exe""'], { shell: false, windowsHide: true, windowsVerbatimArguments: true })
  })

  it('classifica caminho não encontrado como configuração', async () => {
    const { promise } = runWithExit(2)
    await expect(promise).resolves.toMatchObject({ ok: false, code: 2, errorType: 'configuration' })
  })

  it('mantém erro genérico como técnico', async () => {
    const { promise } = runWithExit(1, 'Falha interna do executor')
    await expect(promise).resolves.toMatchObject({ ok: false, code: 1, errorType: 'technical' })
  })

  it('decodifica stderr CP850 do Deploy sem perder acentos', async () => {
    const proc = createProcess()
    const lines = []
    const event = { reply: (channel, payload) => { if (channel === 'cmd-line') lines.push(payload.line) } }
    const promise = processRunner.runDeployItemTracked(event, 'deploy-encoding', { name: 'Aplicativo', path: 'C:\\Pacotes\\app.exe', type: 'executable' }, vi.fn(() => proc))
    proc.stderr.emit('data', iconv.encode('não é reconhecido\r\noperação inválida\r\ncaminho não encontrado\r\n', 'cp850'))
    proc.stderr.emit('end')
    proc.emit('close', 1)
    await promise
    expect(lines.join('\n')).toContain('não é reconhecido')
    expect(lines.join('\n')).toContain('operação inválida')
    expect(lines.join('\n')).toContain('caminho não encontrado')
  })

  it('retorna cancelado quando Parar antecede o close', async () => {
    const proc = createProcess()
    const promise = processRunner.runDeployItemTracked(null, 'deploy-stop', { name: 'Teste longo', path: 'C:\\Pacotes\\deploy-teste.bat', type: 'script' }, vi.fn(() => proc))
    processRunner.stopRun('deploy-stop')
    proc.emit('close', 1)
    await expect(promise).resolves.toMatchObject({ ok: false, code: -1, cancelled: true })
  })

  it('cria console visível no mesmo processo rastreado', async () => {
    const proc = createProcess()
    const spawnProcess = vi.fn(() => proc)
    const promise = processRunner.runDeployItemTracked(null, 'deploy-visible', { name: 'Script', path: 'C:\\Pacotes\\interativo.bat', type: 'script', showConsole: true }, spawnProcess)
    expect(spawnProcess).toHaveBeenCalledWith('cmd.exe', ['/d', '/s', '/c', 'start "" /wait cmd.exe /d /s /c ""C:\\Pacotes\\interativo.bat""'], {
      shell: false,
      windowsHide: true,
      windowsVerbatimArguments: true,
    })
    let settled = false
    promise.then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)
    proc.emit('close', 0)
    await expect(promise).resolves.toEqual({ ok: true, code: 0 })
  })

  it('preserva cancelamento no modo console visível', async () => {
    const proc = createProcess()
    const promise = processRunner.runDeployItemTracked(null, 'deploy-visible-stop', { name: 'Script', path: 'C:\\Pacotes\\interativo.cmd', type: 'script', showConsole: true }, vi.fn(() => proc))
    processRunner.stopRun('deploy-visible-stop')
    proc.emit('close', 1)
    await expect(promise).resolves.toMatchObject({ ok: false, code: -1, cancelled: true })
  })

  it('preserva path com espaços e argumentos em BAT rastreado', async () => {
    const proc = createProcess()
    const spawnProcess = vi.fn(() => proc)
    const promise = processRunner.runDeployItemTracked(null, 'deploy-script', { name: 'Script', path: 'C:\\Pacotes\\deploy teste.cmd', args: '/modo teste', type: 'script' }, spawnProcess)
    expect(spawnProcess).toHaveBeenCalledWith('cmd.exe', ['/d', '/s', '/c', '""C:\\Pacotes\\deploy teste.cmd" /modo teste"'], { shell: false, windowsHide: true, windowsVerbatimArguments: true })
    proc.emit('close', 5)
    await expect(promise).resolves.toMatchObject({ ok: false, code: 5 })
  })

  it('não apresenta Shell fire-and-forget como conclusão', async () => {
    const result = await processRunner.runDeployItemTracked(null, 'deploy-open', { name: 'Documento', path: 'C:\\Pacotes\\manual.pdf', type: 'open' }, undefined, vi.fn(async () => ''))
    expect(result).toMatchObject({ ok: false, started: true, untracked: true })
  })

  it('rejeita tipo Script com extensão incompatível', async () => {
    await expect(processRunner.runDeployItemTracked(null, 'deploy-script-invalid', { name: 'Script', path: 'C:\\Pacotes\\app.exe', type: 'script' })).resolves.toMatchObject({ ok: false, errorType: 'configuration' })
  })

  it('rejeita configuração sem caminho antes de criar processo', async () => {
    const spawnProcess = vi.fn()
    await expect(processRunner.runDeployItemTracked(null, 'deploy-empty', { name: 'Aplicativo', path: '', type: 'executable' }, spawnProcess)).resolves.toMatchObject({ ok: false, errorType: 'configuration' })
    expect(spawnProcess).not.toHaveBeenCalled()
  })
})

const windowsIt = process.platform === 'win32' ? it : it.skip

describe('deploy BAT integration on Windows', () => {
  windowsIt('executa BAT real sem espaços pelo caminho de produção', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-deploy-'))
    const batPath = path.join(tempDir, 'teste.bat')
    fs.writeFileSync(batPath, '@echo off\r\necho SCRIPT_OK\r\nexit /b 0\r\n', 'ascii')
    const lines = []
    const event = { reply: (channel, payload) => { if (channel === 'cmd-line') lines.push(payload.line) } }
    try {
      await expect(processRunner.runDeployItemTracked(event, 'real-bat', { name: 'BAT real', path: batPath, type: 'script' })).resolves.toEqual({ ok: true, code: 0 })
      expect(lines.join('\n')).toContain('SCRIPT_OK')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  windowsIt('executa BAT real em console visível mantendo tracking', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-deploy-visible-'))
    const batPath = path.join(tempDir, 'visivel.bat')
    fs.writeFileSync(batPath, '@echo off\r\necho CONSOLE_VISIVEL_OK\r\nping 127.0.0.1 -n 2 >nul\r\nexit /b 0\r\n', 'ascii')
    const startedAt = Date.now()
    try {
      await expect(processRunner.runDeployItemTracked(null, 'real-bat-visible', { name: 'BAT visível', path: batPath, type: 'script', showConsole: true })).resolves.toEqual({ ok: true, code: 0 })
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(500)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  windowsIt('mantém BAT real com pause executando e cancela o console', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-deploy-pause-'))
    const batPath = path.join(tempDir, 'interativo.bat')
    fs.writeFileSync(batPath, '@echo off\r\necho TESTE DE CONSOLE\r\npause\r\necho CONTINUANDO\r\nexit /b 0\r\n', 'ascii')
    const runId = 'real-bat-pause'
    const promise = processRunner.runDeployItemTracked(null, runId, { name: 'BAT interativo', path: batPath, type: 'script', showConsole: true })
    let settled = false
    promise.then(() => { settled = true })
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      expect(settled).toBe(false)
      processRunner.stopRun(runId)
      await expect(promise).resolves.toMatchObject({ ok: false, code: -1, cancelled: true })
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  windowsIt('executa BAT real com espaços e aguarda close', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-deploy-'))
    const tempDir = path.join(root, 'Pasta Com Espaco')
    fs.mkdirSync(tempDir)
    const batPath = path.join(tempDir, 'teste longo.bat')
    fs.writeFileSync(batPath, '@echo off\r\necho INICIO\r\nping 127.0.0.1 -n 2 >nul\r\necho FIM\r\nexit /b 0\r\n', 'ascii')
    const lines = []
    const event = { reply: (channel, payload) => { if (channel === 'cmd-line') lines.push(payload.line) } }
    const startedAt = Date.now()
    try {
      await expect(processRunner.runDeployItemTracked(event, 'real-bat-space', { name: 'BAT com espaço', path: `  "${batPath}"  `, type: 'script' })).resolves.toEqual({ ok: true, code: 0 })
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(500)
      expect(lines.join('\n')).toContain('INICIO')
      expect(lines.join('\n')).toContain('FIM')
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
