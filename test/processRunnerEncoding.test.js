import { describe, expect, it } from 'vitest'
import iconv from 'iconv-lite'
import processRunner from '../src/main/processRunner.js'

const {
  createWindowsLineDecoder,
  WINDOWS_COMMAND_ENCODING,
} = processRunner

function decodeChunks(text, chunkSizes = [], encoding = WINDOWS_COMMAND_ENCODING) {
  const lines = []
  const decoder = createWindowsLineDecoder(line => lines.push(line), encoding)
  const encoded = iconv.encode(text, encoding)
  let offset = 0

  for (const size of chunkSizes) {
    decoder.write(encoded.subarray(offset, offset + size))
    offset += size
  }
  if (offset < encoded.length) decoder.write(encoded.subarray(offset))
  decoder.end()

  return lines
}

describe('Windows command output decoding', () => {
  it('decodes pt-BR accents from CP850 without introducing question marks', () => {
    const text = 'Configuração: português, memória física, versão, conexões, serão, não, êxito\r\n'
    const lines = decodeChunks(text, [1, 2, 3, 4, 5])

    expect(lines).toEqual(['Configuração: português, memória física, versão, conexões, serão, não, êxito'])
    expect(lines[0]).not.toContain('?')
    expect(lines[0]).not.toContain('�')
  })

  it('decodes representative net use output', () => {
    const lines = decodeChunks('Novas conexões serão lembradas.\r\nNão existem entradas na lista.\r\n', [7, 11])

    expect(lines).toEqual([
      'Novas conexões serão lembradas.',
      'Não existem entradas na lista.',
    ])
  })

  it('decodes representative systeminfo output', () => {
    const lines = decodeChunks('Versão do sistema operacional: Português\r\nConfiguração do SO: Memória física\r\n', [13, 17])

    expect(lines).toEqual([
      'Versão do sistema operacional: Português',
      'Configuração do SO: Memória física',
    ])
  })

  it('preserves ASCII output', () => {
    expect(decodeChunks('Status: OK\r\nExit code: 0\r\n', [1])).toEqual([
      'Status: OK',
      'Exit code: 0',
    ])
  })

  it('supports UTF-8 output when explicitly selected', () => {
    expect(decodeChunks('Saída UTF-8: ação concluída\r\n', [1, 2, 3], 'utf8')).toEqual([
      'Saída UTF-8: ação concluída',
    ])
  })

  it('decodes accented stderr content with the same decoder', () => {
    expect(decodeChunks('Erro: operação não permitida\r\n', [8])).toEqual([
      'Erro: operação não permitida',
    ])
  })

  it('flushes a final line without newline', () => {
    expect(decodeChunks('Conclusão com êxito', [4, 1])).toEqual(['Conclusão com êxito'])
  })
})
