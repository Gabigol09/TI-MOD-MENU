// WMIC no Win11+: "os get Caption" pode funcionar, mas "path ..." retorna "Verbo inválido"

const { exec } = require('child_process')

const BROKEN_MARKERS = [
  'verbo inv',
  'invalid verb',
  'invalid use',
  'não tem suporte',
  'not supported',
  'node - wmic',
]

function outputLooksBroken(text) {
  const lower = (text || '').toLowerCase()
  return BROKEN_MARKERS.some(m => lower.includes(m))
}

function checkWmicFunctional() {
  return new Promise(resolve => {
    const test = 'wmic path Win32_PNPEntity get Name 2>&1'
    exec(test, { timeout: 6000, windowsHide: true }, (err, stdout, stderr) => {
      const combined = `${stdout || ''}${stderr || ''}`
      if (outputLooksBroken(combined)) return resolve(false)
      if (err) return resolve(false)
      if (/44\d{3}/.test(combined) && !/name/i.test(combined)) return resolve(false)
      resolve(/name/i.test(combined) && combined.trim().length > 10)
    })
  })
}

module.exports = { checkWmicFunctional, outputLooksBroken }
