import { describe, expect, it } from 'vitest'
import { validateConfig } from '../src/main/configValidator.js'

describe('Preparation Profile Validator', () => {
  it('valida preparationProfile e suas propriedades booleanas básicas', () => {
    const config = { preparationProfile: { enabled: true } }
    expect(validateConfig(config).valid).toBe(true)

    expect(validateConfig({ preparationProfile: { enabled: 'true' } }).valid).toBe(false)
    expect(validateConfig({ preparationProfile: { enabled: true, unknown: 1 } }).valid).toBe(false)
  })

  it('valida choices configuráveis', () => {
    const config = {
      deploy: { categories: [{ id: 'cat', name: 'Pacotes', softwares: [
        { id: 'soft-office2016', name: 'Pacote A', path: 'C:\\Pacotes\\a.exe', type: 'executable', description: '' },
        { id: 'soft-office365', name: 'Pacote B', path: 'C:\\Pacotes\\b.exe', type: 'executable', description: '' },
      ] }] },
      preparationProfile: {
        choices: [
          {
            id: 'office-version',
            label: 'Versão do Office',
            required: true,
            options: [
              { value: '2016', label: 'Office 2016', deployItems: ['soft-office2016'] },
              { value: '365', label: 'Office 365', deployItems: ['soft-office365'] }
            ]
          }
        ]
      }
    }
    expect(validateConfig(config).valid).toBe(true)

    const invalid = JSON.parse(JSON.stringify(config))
    invalid.preparationProfile.choices[0].options[0].deployItems = 'soft-office2016' // não é lista
    expect(validateConfig(invalid).valid).toBe(false)
  })

  it('valida array de actions nas fases (preDeploy, staging, postDeploy, cleanup)', () => {
    const config = {
      deploy: { categories: [{ id: 'cat', name: 'Cat', softwares: [{ id: 'soft-greenshot', name: 'App', path: 'C:\\a.exe', type: 'executable', description: '' }] }] },
      preparationProfile: {
        preDeploy: [
          { id: 'sync1', type: 'action', action: 'sync-time', blocking: true },
          { id: 'saveEnergy1', type: 'action', action: 'save-power-settings', blocking: true },
          { id: 'disableSleep1', type: 'action', action: 'disable-sleep-temporarily', blocking: true }
        ],
        staging: [
          { id: 'copy1', type: 'action', action: 'copy-directory', source: '\\\\server\\app', destination: 'C:\\App', blocking: true },
          { id: 'copy2', type: 'action', action: 'copy-file', source: '\\\\server\\file.txt', destination: 'C:\\App\\file.txt', blocking: false },
          { id: 'copy3', type: 'action', action: 'robocopy', source: '\\\\server\\app2', destination: 'C:\\App2', args: '/E /R:1 /W:1', blocking: true }
        ],
        postDeploy: [],
        cleanup: [
          { id: 'restore1', type: 'action', action: 'restore-power-settings', blocking: true },
          { id: 'remove1', type: 'action', action: 'remove-directory', path: 'C:\\App', blocking: false }
        ]
      }
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
  })

  it('rejeita tipos, actions e campos não mapeados', () => {
    expect(validateConfig({ preparationProfile: { preDeploy: [{ type: 'unknown' }] } }).valid).toBe(false)
    expect(validateConfig({ preparationProfile: { preDeploy: [{ type: 'action', action: 'execute-any-command', command: 'echo 1' }] } }).valid).toBe(false)
  })

  it('separa erro referencial do erro estrutural para permitir modo de reparo', () => {
    const config = {
      deploy: { categories: [{ id: 'cat', name: 'Cat', softwares: [{ id: 'soft-exist', name: 'App', path: 'C:\\a.exe', type: 'executable', description: '' }] }] },
      preparationProfile: {
        choices: [], preDeploy: [], staging: [], postDeploy: [
          { id: 'step-1', type: 'deploy-item-ref', itemId: 'missing-soft', blocking: true }
        ], cleanup: []
      }
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
    expect(result.referenceErrors.length).toBe(1)
  })

  it('mantém action inválida, campo obrigatório ausente e ID duplicado como erros estruturais', () => {
    const result = validateConfig({ preparationProfile: {
      preDeploy: [
        { id: 'same', type: 'action', action: 'execute-any-command' },
        { id: 'same', type: 'action', action: 'ensure-directory' },
      ],
    } })
    expect(result.valid).toBe(false)
    expect(result.referenceErrors).toEqual([])
    expect(result.errors.some(error => error.reason.includes('não mapeada'))).toBe(true)
    expect(result.errors.some(error => error.reason.includes('duplicado'))).toBe(true)
    expect(result.errors.some(error => error.field.endsWith('.path'))).toBe(true)
  })
})