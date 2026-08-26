import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import configLoader from '../src/main/configLoader.js'
import configuredPath from '../src/main/configuredPath.js'
import state from '../src/main/machinePreparationState.js'
import sharedStore from '../src/main/sharedConfigStore.js'

const { validateConfig, DEFAULTS, deepMerge, configureSharedSettings, getSharedConfigStatus, loadConfig, reloadSharedConfig, saveConfig } = configLoader
const { normalizeConfigPaths } = configuredPath
const { createPreparationStateStore } = state
const { createSharedConfigStore, extractSharedSettings, resolveSharedSettingsPath, validateEmptyPayload } = sharedStore

function createStore(filePath, fileSystem = fs) {
  return createSharedConfigStore({ filePath, validate: validateConfig, normalize: normalizeConfigPaths, fileSystem })
}

function withTempDir(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ti-shared-config-'))
  try { return run(directory) } finally { fs.rmSync(directory, { recursive: true, force: true }) }
}

describe('shared config IPC contract', () => {
  it('aceita somente payload vazio estrito', () => {
    expect(validateEmptyPayload({})).toBe(true)
    expect(validateEmptyPayload(null)).toBe(false)
    expect(validateEmptyPayload([])).toBe(false)
    expect(validateEmptyPayload({ path: 'C:\\arbitrario' })).toBe(false)
  })
})

describe('shared settings location', () => {
  it('usa raiz do projeto em desenvolvimento', () => {
    expect(resolveSharedSettingsPath({ isPackaged: false, execPath: 'C:\\Node\\node.exe', projectRoot: 'C:\\Projeto' })).toBe(path.join('C:\\Projeto', 'ti-director-settings.json'))
  })

  it('usa diretório oficial do portable antes do executável temporário', () => {
    expect(resolveSharedSettingsPath({
      isPackaged: true,
      execPath: 'C:\\Temp\\extraido\\TI Director Mode.exe',
      projectRoot: 'C:\\Projeto',
      portableDir: 'C:\\Apps\\TI Director',
      portableFile: 'C:\\Apps\\TI Director\\TI_DirectorMode.exe',
    })).toBe(path.join('C:\\Apps\\TI Director', 'ti-director-settings.json'))
  })

  it('usa o arquivo oficial do portable quando o diretório não está disponível', () => {
    expect(resolveSharedSettingsPath({
      isPackaged: true,
      execPath: 'C:\\Temp\\extraido\\TI Director Mode.exe',
      projectRoot: 'C:\\Projeto',
      portableFile: 'C:\\Apps\\TI Director\\TI_DirectorMode.exe',
    })).toBe(path.join('C:\\Apps\\TI Director', 'ti-director-settings.json'))
  })

  it('usa diretório de process.execPath como fallback packaged', () => {
    expect(resolveSharedSettingsPath({ isPackaged: true, execPath: 'C:\\Apps\\TI Director\\app.exe', projectRoot: 'C:\\Projeto' })).toBe(path.join('C:\\Apps\\TI Director', 'ti-director-settings.json'))
  })
})

describe('shared config store', () => {
  it('retorna missing e mantém defaults quando arquivo não existe', () => withTempDir(directory => {
    const store = createStore(path.join(directory, 'ti-director-settings.json'))
    const loaded = store.load()
    expect(loaded).toMatchObject({ ok: true, config: null, status: { state: 'missing' } })
    expect(deepMerge(DEFAULTS, loaded.config || {})).toEqual(DEFAULTS)
  }))

  it('carrega configuração válida e preserva defaults ausentes', () => withTempDir(directory => {
    const filePath = path.join(directory, 'ti-director-settings.json')
    fs.writeFileSync(filePath, JSON.stringify({ network: { softDrive: 'T:' } }), 'utf8')
    const loaded = createStore(filePath).load()
    expect(loaded.status.state).toBe('ready')
    const effective = deepMerge(DEFAULTS, loaded.config)
    expect(effective.network.softDrive).toBe('T:')
    expect(effective.paths.chrome).toBe(DEFAULTS.paths.chrome)
  }))

  it('não aplica JSON inválido ou estado local', () => withTempDir(directory => {
    const filePath = path.join(directory, 'ti-director-settings.json')
    fs.writeFileSync(filePath, '{', 'utf8')
    expect(createStore(filePath).load()).toMatchObject({ ok: false, config: null, status: { state: 'invalid' } })
    fs.writeFileSync(filePath, JSON.stringify({ expectedHostname: 'PC-EXEMPLO', rebootAfterDeploy: true }), 'utf8')
    expect(createStore(filePath).load()).toMatchObject({ ok: false, config: null, status: { state: 'invalid' } })
  }))

  it('cria arquivo legível por escrita temporária e rename', () => withTempDir(directory => {
    const filePath = path.join(directory, 'ti-director-settings.json')
    const store = createStore(filePath)
    store.load()
    expect(store.save({ paths: { chrome: 'C:\\Pacotes\\app.exe' }, deploy: DEFAULTS.deploy })).toMatchObject({ ok: true, status: { state: 'ready' } })
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false)
    expect(createStore(filePath).load()).toMatchObject({ ok: true, status: { state: 'ready' } })
  }))

  it('detecta alteração externa e não sobrescreve', () => withTempDir(directory => {
    const filePath = path.join(directory, 'ti-director-settings.json')
    fs.writeFileSync(filePath, JSON.stringify({ network: { softDrive: 'S:' } }), 'utf8')
    const storeA = createStore(filePath)
    const storeB = createStore(filePath)
    storeA.load()
    storeB.load()
    expect(storeB.save({ network: { softDrive: 'T:' } }).ok).toBe(true)
    const external = fs.readFileSync(filePath, 'utf8')
    expect(storeA.save({ network: { softDrive: 'U:' } })).toMatchObject({ ok: false, state: 'conflict' })
    expect(fs.readFileSync(filePath, 'utf8')).toBe(external)
  }))

  it('preserva arquivo anterior quando escrita temporária falha', () => {
    const files = new Map([['settings.json', '{"network":{"softDrive":"S:"}}']])
    const fileSystem = {
      existsSync: target => files.has(target),
      readFileSync: target => files.get(target),
      statSync: () => ({ mtime: new Date(0) }),
      writeFileSync: () => { const error = new Error('sem permissão'); error.code = 'EACCES'; throw error },
      renameSync: () => { throw new Error('não deveria renomear') },
      unlinkSync: target => files.delete(target),
    }
    const store = createStore('settings.json', fileSystem)
    store.load()
    expect(store.save({ network: { softDrive: 'T:' } })).toMatchObject({ ok: false, state: 'readOnly' })
    expect(files.get('settings.json')).toBe('{"network":{"softDrive":"S:"}}')
  })

  it('leitura indisponível não impede fallback', () => {
    const error = new Error('acesso negado')
    error.code = 'EACCES'
    const fileSystem = { existsSync: () => true, readFileSync: () => { throw error } }
    expect(createStore('settings.json', fileSystem).load()).toMatchObject({ ok: false, config: null, status: { state: 'unavailable' } })
  })

  it('persiste catálogo atual sem estado local ou segredos', () => {
    const shared = extractSharedSettings({
      deploy: { categories: [{ id: 'cat', name: 'Scripts', softwares: [{ id: 'bat', name: 'BAT', path: 'C:\\Pacotes\\teste.bat', type: 'script', defaultForPreparation: true, showConsole: true }] }] },
      expectedHostname: 'PC-EXEMPLO',
      rebootAfterDeploy: true,
      password: 'segredo',
    })
    expect(shared.deploy.categories[0].softwares[0]).toMatchObject({ type: 'script', defaultForPreparation: true, showConsole: true })
    expect(shared).not.toHaveProperty('expectedHostname')
    expect(shared).not.toHaveProperty('rebootAfterDeploy')
    expect(shared).not.toHaveProperty('password')
  })

  it('reload compartilhado não toca o state local', () => withTempDir(directory => {
    const localStore = createPreparationStateStore(path.join(directory, 'machine-preparation.json'))
    localStore.write('PC-EXEMPLO')
    localStore.deferUntilAfterDeploy()
    const before = localStore.read()
    const sharedPath = path.join(directory, 'ti-director-settings.json')
    fs.writeFileSync(sharedPath, JSON.stringify({ network: { softDrive: 'T:' } }), 'utf8')
    createStore(sharedPath).load()
    expect(localStore.read()).toEqual(before)
  }))

  it('integração: load, save, reload e nova instância usam o mesmo path portable', () => withTempDir(directory => {
    const extractedDirectory = path.join(directory, 'extraido')
    const portableDirectory = path.join(directory, 'portable')
    fs.mkdirSync(extractedDirectory)
    fs.mkdirSync(portableDirectory)
    const options = {
      isPackaged: true,
      execPath: path.join(extractedDirectory, 'TI Director Mode.exe'),
      projectRoot: path.join(directory, 'projeto'),
      portableDir: portableDirectory,
      portableFile: path.join(portableDirectory, 'TI_DirectorMode.exe'),
    }
    const filePath = path.join(portableDirectory, 'ti-director-settings.json')

    configureSharedSettings(options)
    loadConfig()
    const saved = saveConfig({ network: { softDrive: 'X:' } })
    expect(saved).toMatchObject({ ok: true, status: { state: 'ready' } })
    expect(fs.existsSync(filePath)).toBe(true)
    expect(fs.existsSync(path.join(extractedDirectory, 'ti-director-settings.json'))).toBe(false)
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).network.softDrive).toBe('X:')
    expect(reloadSharedConfig()).toMatchObject({ ok: true, config: { network: { softDrive: 'X:' } }, status: { state: 'ready' } })
    expect(getSharedConfigStatus()).toMatchObject({ state: 'ready', source: 'app-directory' })

    configureSharedSettings(options)
    const config2 = loadConfig()
    expect(config2.network.softDrive).toBe('X:')
  }))
})
