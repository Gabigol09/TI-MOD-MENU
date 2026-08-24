import { describe, expect, it } from 'vitest'
import corporatePaths from '../src/main/corporatePaths.js'
import configLoader from '../src/main/configLoader.js'

const { resolvePaths } = corporatePaths
const { DEFAULTS, deepMerge } = configLoader

describe('resolvePaths', () => {
  it('resolve caminhos e parâmetros configurados deterministicamente', () => {
    const config = deepMerge(DEFAULTS, {
      network: { softServer: '\\\\servidor\\compartilhamento', softDrive: 'T:' },
      paths: {
        office365: 'C:\\Pacotes\\Office 365\\setup.exe',
        office2016: 'C:\\Pacotes\\Office 2016\\setup.exe',
        office2016Config: 'C:\\Pacotes\\Office 2016\\config.xml',
      },
      hostname: { notebookPrefix: 'LT' },
    })

    const paths = resolvePaths(config)

    expect(paths.SOFT_UNC).toBe('\\\\servidor\\compartilhamento')
    expect(paths.SOFT_DRIVE).toBe('T:')
    expect(paths.OFFICE_365_START).toBe('start "" "C:\\Pacotes\\Office 365\\setup.exe"')
    expect(paths.OFFICE_2016_START).toBe('start "" "C:\\Pacotes\\Office 2016\\setup.exe" /config "C:\\Pacotes\\Office 2016\\config.xml"')
    expect(paths.NOTEBOOK_PREFIX).toBe('LT')
  })
})
