// Caminhos corporativos — atualize aqui se a rede mudar

module.exports = {
  SOFT_UNC: '\\\\sjkfs13.sjk.emb\\soft',
  SOFT_DRIVE: 'S:',
  OFFICE_365_START: 'start "" "\\\\sjkfs13.sjk.emb\\SOFT\\Utilitarios\\EasyDeploy\\IGOR\\OfficeSetup.exe"',
  OFFICE_2016_START: 'start "" "\\\\sjkfs13.sjk.emb\\SOFT\\Licenciados\\Midias Download\\Microsoft Office\\2016\\PRO\\PT-BR\\x64\\setup.exe" /config "\\\\sjkfs13.sjk.emb\\soft\\Utilitarios\\EasyDeploy\\SoftwaresBasicos\\Office2016_PRO.xml"',
  // Ajuste o executável se o caminho na rede for outro
  ROLLOUT_ASSISTANT: '\\\\sjkfs13.sjk.emb\\SOFT\\Utilitarios\\EasyDeploy\\RolloutAssistant.exe',
}
