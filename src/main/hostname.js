const { exec } = require('child_process')

function getHostname() {
  return new Promise(resolve => {
    exec('hostname', { windowsHide: true, timeout: 3000 }, (err, stdout) => {
      resolve(err ? '' : stdout.replace(/\r/g, '').trim())
    })
  })
}

function validateHostname(hostname, pattern) {
  const normalizedHostname = String(hostname || '').trim()
  const normalizedPattern = String(pattern || '').trim()

  if (!normalizedHostname) return { status: 'unavailable' }
  if (!normalizedPattern) return { status: 'disabled' }

  try {
    const regex = new RegExp(normalizedPattern)
    return { status: regex.test(normalizedHostname) ? 'match' : 'mismatch' }
  } catch (err) {
    return { status: 'invalid-pattern', error: err.message }
  }
}

module.exports = { getHostname, validateHostname }
