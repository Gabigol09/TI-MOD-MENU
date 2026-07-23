// Aplica icon.ico no exe interno (win-unpacked). Portable recebe icone via NSIS no build.

const fs = require('fs')
const path = require('path')
const { rcedit } = require('rcedit')

const ROOT = path.join(__dirname, '..')
const ICON = path.join(ROOT, 'build', 'icon.ico')
const UNPACKED = path.join(ROOT, 'release', 'win-unpacked', 'TI Director Mode.exe')

async function main() {
  if (!fs.existsSync(ICON)) {
    console.error('Falta build/icon.ico — rode npm run build:icon')
    process.exit(1)
  }
  if (!fs.existsSync(UNPACKED)) {
    console.warn('win-unpacked nao encontrado — icone NSIS ja aplicado no portable')
    return
  }
  await rcedit(UNPACKED, { icon: ICON })
  console.log('Icone aplicado:', path.basename(UNPACKED))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
