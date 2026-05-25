// Caminhos corporativos — atualize aqui se a rede mudar

module.exports = {
  SOFT_UNC: '\\\\servidor.empresa.local\\soft',
  SOFT_DRIVE: 'S:',
  OFFICE_365_START: 'start "" "\\\\servidor.empresa.local\\SOFT\\Utilitarios\\DeployTools\\TI\\OfficeSetup.exe"',
  OFFICE_2016_START: 'start "" "\\\\servidor.empresa.local\\SOFT\\Licenciados\\Midias Download\\Microsoft Office\\2016\\PRO\\PT-BR\\x64\\setup.exe" /config "\\\\servidor.empresa.local\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\Office2016_PRO.xml"',
  // Ajuste o executável se o caminho na rede for outro
  ROLLOUT_ASSISTANT: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\DeployTools\\RolloutTool.exe',
}
