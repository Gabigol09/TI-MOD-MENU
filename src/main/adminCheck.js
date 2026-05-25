// Verificação de privilégios elevados — apenas net session (cmd), sem PowerShell

const { exec } = require('child_process')

function checkIsAdmin() {
  return new Promise(resolve => {
    exec('net session', { windowsHide: true, timeout: 4000 }, err => {
      resolve(!err)
    })
  })
}

module.exports = { checkIsAdmin }
