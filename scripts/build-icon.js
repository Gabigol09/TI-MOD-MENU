// Gera build/icon.ico a partir de build/icon.png (multi-tamanho para Windows)

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'build', 'icon.png')
const OUT = path.join(ROOT, 'build', 'icon.ico')
const SIZES = [16, 24, 32, 48, 64, 128, 256]

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Arquivo nao encontrado:', SRC)
    process.exit(1)
  }
  const buffers = await Promise.all(
    SIZES.map(size =>
      sharp(SRC)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .png()
        .toBuffer()
    )
  )
  const pngToIco = (await import('png-to-ico')).default
  const ico = await pngToIco(buffers)
  fs.writeFileSync(OUT, ico)
  console.log('OK:', OUT, `(${SIZES.length} tamanhos)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
