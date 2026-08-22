const test = require('node:test')
const assert = require('node:assert/strict')
const { validateHostname } = require('../src/main/hostname')

const pattern = '^[A-Za-z]{2}\\d{5}S$'

test('hostname compatível retorna match', () => {
  assert.deepEqual(validateHostname('AB12345S', pattern), { status: 'match' })
})

test('hostname incompatível retorna mismatch', () => {
  assert.deepEqual(validateHostname('FORA-DO-PADRAO', pattern), { status: 'mismatch' })
})

test('hostname indisponível não retorna mismatch', () => {
  assert.deepEqual(validateHostname('', pattern), { status: 'unavailable' })
})

test('regra vazia desabilita a validação', () => {
  assert.deepEqual(validateHostname('AB12345S', ''), { status: 'disabled' })
})

test('regex inválida retorna erro de configuração', () => {
  const result = validateHostname('AB12345S', '[')
  assert.equal(result.status, 'invalid-pattern')
  assert.equal(typeof result.error, 'string')
  assert.ok(result.error.length > 0)
})
