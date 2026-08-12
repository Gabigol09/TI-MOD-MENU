// Todos os comandos e categorias — espelho fiel da v1.5 AHK

export const CATEGORIES = [
  {
    id: 'rede',
    name: 'Rede',
    sub: 'mapear / diagnosticar / resetar',
    cmds: [
      { name: 'Mapear Soft (S:)',        desc: 'net use S:',                                     type: 'script', cmd: 'SCRIPT_MAPEAR_SOFT',       tip: 'Mapeia S: pedindo usuario e senha TI - servidor definido no config.json' },
      { name: 'IP Config completo',       desc: 'ipconfig /all',                                 type: 'cmd',    cmd: 'ipconfig /all',             tip: 'Exibe todos adaptadores, IPs, MAC e DNS' },
      { name: 'Flush DNS',               desc: 'ipconfig /flushdns',                            type: 'cmd',    cmd: 'ipconfig /flushdns',        tip: 'Limpa cache DNS - resolve sites e pastas que param de abrir' },
      { name: 'Ping gateway',            desc: 'ping 192.168.1.1 -t',                           type: 'cmd',    cmd: 'ping 192.168.1.1 -t',       tip: 'Testa conectividade continua com o gateway' },
      { name: 'Ver mapeamentos',         desc: 'net use',                                       type: 'cmd',    cmd: 'net use',                   tip: 'Lista todas as unidades de rede mapeadas' },
      { name: 'Resetar adaptador',       desc: 'netsh int ip reset + winsock',                  type: 'cmd',    cmd: 'netsh int ip reset & netsh winsock reset', tip: 'Reseta pilha TCP/IP. Requer reboot apos executar' },
      { name: 'Remover perfis WiFi salvos', desc: 'netsh wlan delete profile (todos)',          type: 'cmd',    cmd: 'for /f "tokens=2 delims=:" %i in (\'netsh wlan show profiles ^| findstr ":"\') do netsh wlan delete profile name="%i" >nul 2>&1 & echo Perfis removidos - reconecte a rede', tip: 'Remove TODOS os perfis WiFi salvos - resolve erros de certificado forcando nova configuracao. Sera preciso reconectar e inserir a senha do WiFi de novo.', dangerous: true },
      { name: 'Sincronizar horario',     desc: 'w32tm /resync /force',                          type: 'cmd',    cmd: 'net stop w32time & net start w32time & w32tm /resync /force', tip: 'Sincroniza relogio - resolve erros de autenticacao no dominio' },
    ]
  },
  {
    id: 'impressoras',
    name: 'Impressoras',
    sub: 'spooler / drivers / filas',
    cmds: [
      { name: 'Resetar Spooler',         desc: 'stop + limpa fila + start',                     type: 'cmd',    cmd: 'net stop spooler & del /Q /F /S %systemroot%\\System32\\spool\\PRINTERS\\*.* & net start spooler', tip: 'Para spooler, limpa fila travada e reinicia' },
      { name: 'Gerenciar impressoras',   desc: 'printmanagement.msc',                           type: 'path',   cmd: '%SystemRoot%\\System32\\printmanagement.msc', tip: 'Console completo de impressoras e drivers' },
      { name: 'Listar impressoras',      desc: 'wmic printer list brief',                       type: 'cmd',    cmd: 'wmic printer list brief',   tip: 'Lista todas as impressoras instaladas' },
      { name: 'Painel impressoras',      desc: 'ms-settings:printers',                          type: 'uri',    cmd: 'ms-settings:printers',      tip: 'Abre o painel de dispositivos e impressoras' },
    ]
  },
  {
    id: 'oracle',
    name: 'Oracle',
    sub: 'sqlplus / tns / conexao',
    cmds: [
      { name: 'Abrir SQLPlus',           desc: 'sqlplus /nolog',                                type: 'cmd',    cmd: 'sqlplus /nolog',            tip: 'Abre console SQLPlus sem login' },
      { name: 'Abrir TNSNames',          desc: 'notepad tnsnames.ora',                          type: 'cmd',    cmd: 'notepad.exe "%ORACLE_HOME%\\network\\admin\\tnsnames.ora"', tip: 'Edita arquivo de configuracao de conexoes Oracle' },
      { name: 'Testar PR07',             desc: 'tnsping PR07',                                  type: 'cmd',    cmd: 'tnsping PR07',              tip: 'Testa se listener Oracle responde no PR07' },
      { name: 'Testar PR01',             desc: 'tnsping PR01',                                  type: 'cmd',    cmd: 'tnsping PR01',              tip: 'Testa se listener Oracle responde no PR01' },
      { name: 'Pasta Oracle Home',       desc: 'Explorer %ORACLE_HOME%',                        type: 'path',   cmd: '%ORACLE_HOME%',             tip: 'Abre diretorio de instalacao do Oracle Client' },
      { name: 'Reiniciar servico',       desc: 'net stop/start OracleServiceXE',                type: 'cmd',    cmd: 'net stop OracleServiceXE & net start OracleServiceXE', tip: 'ATENCAO - para e reinicia o servico Oracle' },
    ]
  },
  {
    id: 'diagnostico',
    name: 'Diagnostico',
    sub: 'inventario / hardware / sistema',
    cmds: [
      { name: 'Nome do PC (Hostname)',   desc: 'hostname',                                      type: 'cmd',    cmd: 'hostname',                  tip: 'Exibe o nome atual do computador na rede' },
      { name: 'Device ID (UUID)',        desc: 'wmic csproduct get UUID',                       type: 'cmd',    cmd: 'wmic csproduct get UUID',   tip: 'ID unico do dispositivo - usado em inventario e rollout' },
      { name: 'Serial BIOS',            desc: 'wmic bios get serialnumber',                    type: 'cmd',    cmd: 'wmic bios get serialnumber', tip: 'Numero de serie do hardware - util para chamados' },
      { name: 'Info geral sistema',     desc: 'systeminfo',                                    type: 'cmd',    cmd: 'systeminfo',                tip: 'SO, RAM, dominio, hotfixes e mais' },
      { name: 'Programas instalados',   desc: 'reg query Uninstall',                           type: 'cmd',    cmd: 'reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall /s /v DisplayName 2>nul | findstr /i DisplayName', tip: 'Lista softwares via registro - nativo' },
      { name: 'Sobre o computador',     desc: 'ms-settings:about',                             type: 'uri',    cmd: 'ms-settings:about',         tip: 'Abre Sistema > Sobre - hostname, UUID, processador, RAM' },
      { name: 'Uso de RAM',             desc: 'wmic OS get FreePhysical/TotalMemory',          type: 'cmd',    cmd: 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize', tip: 'RAM total e livre em KB' },
      { name: 'Servicos ativos',        desc: 'services.msc',                                  type: 'path',   cmd: '%SystemRoot%\\System32\\services.msc', tip: 'Console de gerenciamento de servicos' },
    ]
  },
  {
    id: 'instalacoes',
    name: 'Instalacoes',
    sub: 'softwares base / rollout',
    cmds: [
      { name: 'Office 365 (Notebook)',   desc: 'OfficeSetup.exe',                               type: 'path',   cmd: '\\\\servidor\\soft\\Utilitarios\\DeployTools\\OfficeSetup.exe', buildCmd: cfg => cfg?.paths?.office365, tip: 'Notebooks - Office 365 atualizado (caminho definido no config.json)' },
      { name: 'Office 2016 (Desktop)',   desc: 'Office2016_PRO.xml x64',                        type: 'open',   cmd: '"\\\\servidor\\soft\\Licenciados\\Microsoft Office\\2016\\PRO\\PT-BR\\x64\\setup.exe" /config "\\\\servidor\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\Office2016_PRO.xml"', buildCmd: cfg => cfg?.paths?.office2016 && `"${cfg.paths.office2016}" /config "${cfg.paths.office2016Config}"`, tip: 'Desktops / mini PCs - Office 2016 Pro' },
      { name: 'Adobe Acrobat Reader',    desc: 'AcroRead.msi /q',                               type: 'open',   cmd: '"\\\\servidor\\soft\\Utilitarios\\Adobe\\Acrobat Reader DC\\Binaries\\AcroRead.msi" /q', buildCmd: cfg => cfg?.paths?.adobeReader && `"${cfg.paths.adobeReader}" /q`, tip: 'Leitor de PDF - obrigatorio em todas as maquinas' },
      { name: 'Google Chrome',           desc: 'ChromeSetup.exe /silent',                       type: 'open',   cmd: '"\\\\servidor\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\ChromeSetup.exe" /silent /install', buildCmd: cfg => cfg?.paths?.chrome && `"${cfg.paths.chrome}" /silent /install`, tip: 'Navegador padrao' },
      { name: 'Microsoft Teams',         desc: 'MSTeamsSetup.exe',                              type: 'path',   cmd: '\\\\servidor\\soft\\Utilitarios\\DeployTools\\MSTeamsSetup.exe', buildCmd: cfg => cfg?.paths?.teams, tip: 'Instalador do Teams' },
      { name: 'PDF Creator',             desc: 'PDFCreator-4_4_3 /silent',                      type: 'open',   cmd: '"\\\\servidor\\soft\\Utilitarios\\Pdf Creator\\PDFCreator-4_4_3-Setup.exe" /silent', buildCmd: cfg => cfg?.paths?.pdfCreator && `"${cfg.paths.pdfCreator}" /silent`, tip: 'Impressora virtual PDF' },
      { name: 'Greenshot',               desc: 'Install.cmd Greenshot 1.3.315',                 type: 'path',   cmd: '\\\\servidor\\soft\\Utilitarios\\Greenshot\\1.3.315\\Install.cmd', buildCmd: cfg => cfg?.paths?.greenshot, tip: 'Ferramenta de captura de tela' },
      { name: 'Notepad++',               desc: 'npp.7.7 x64 /S',                               type: 'open',   cmd: '"\\\\servidor\\soft\\Notepad++\\7.7\\x64\\npp.7.7.Installer.x64.exe" /S', buildCmd: cfg => cfg?.paths?.notepadPlusPlus && `"${cfg.paths.notepadPlusPlus}" /S`, tip: 'Editor de texto avancado' },
      { name: 'Firefox ESR',             desc: 'Firefox 102.7.0esr /qn',                        type: 'open',   cmd: '"\\\\servidor\\soft\\Internet\\Firefox\\102.7.0\\Firefox Setup 102.7.0esr.msi" /qn', buildCmd: cfg => cfg?.paths?.firefox && `"${cfg.paths.firefox}" /qn`, tip: 'Navegador Firefox' },
      { name: 'Power BI Desktop',        desc: 'PBIDesktopSetup_x64.exe',                       type: 'open',   cmd: '"\\\\servidor\\soft\\Utilitarios\\PowerBI Desktop\\2.153.1206.0\\Installer\\PBIDesktopSetup_x64.exe" -quiet -norestart ACCEPT_EULA=1', buildCmd: cfg => cfg?.paths?.powerBI && `"${cfg.paths.powerBI}" -quiet -norestart ACCEPT_EULA=1`, tip: 'Power BI - instalar somente se solicitado' },
      { name: 'Abrir pasta Soft',        desc: 'Explorer <servidor configurado>',              type: 'folder', cmd: '\\\\servidor\\soft', buildCmd: cfg => cfg?.network?.softServer, tip: 'Abre compartilhamento de software - caminho definido no config.json' },
    ]
  },
  {
    id: 'scripts',
    name: 'Scripts',
    sub: 'automacoes / rollout / batch',
    cmds: [
      { name: 'Preparar maquina nova',   desc: 'Soft > Office (por tipo de maquina)',           type: 'script', cmd: 'SCRIPT_NOVA_MAQ',           tip: 'Mapeia Soft, detecta NB/Desktop, abre o instalador do Office certo' },
      { name: 'Inventario do usuario',   desc: 'Sobre PC + Device ID + Programas',              type: 'script', cmd: 'SCRIPT_INVENTARIO',         tip: 'Abre 3 evidencias de rollout e solicita print' },
      { name: 'Limpar temporarios',      desc: 'del %temp%\\* /q /f /s',                        type: 'cmd',    cmd: 'del %temp%\\* /q /f /s',    tip: 'Apaga arquivos temporarios do usuario atual' },
      { name: 'Forcar GPO',             desc: 'gpupdate /force',                               type: 'cmd',    cmd: 'gpupdate /force',           tip: 'Aplica politicas de grupo imediatamente' },
      { name: 'Verificar integridade',   desc: 'sfc /scannow',                                  type: 'cmd',    cmd: 'sfc /scannow',              tip: 'Verifica e repara arquivos de sistema corrompidos' },
    ]
  },
  {
    id: 'drivers',
    name: 'Drivers',
    sub: 'diagnostico / monitores / hardware',
    cmds: [
      { name: 'Gerenciador dispositivos', desc: 'devmgmt.msc',                                  type: 'path',   cmd: '%SystemRoot%\\System32\\devmgmt.msc', tip: 'Procure por ! amarelo ou ? (driver ausente)' },
      { name: 'Drivers com problema',    desc: 'pnputil /enum-devices /problem',                type: 'cmd',    cmd: 'pnputil /enum-devices /problem', tip: 'Lista dispositivos com erro de driver (CMD nativo — substitui WMIC no Win11)' },
      { name: 'Windows Update',          desc: 'ms-settings:windowsupdate',                    type: 'uri',    cmd: 'ms-settings:windowsupdate', tip: 'Pode baixar drivers de monitor e chipset automaticamente' },
      { name: 'Placa de video',          desc: 'wmic Win32_VideoController',                    type: 'cmd',    cmd: 'wmic path Win32_VideoController get Name,DriverVersion,Status', tip: 'Mostra GPU e versao do driver' },
      { name: 'Informacao monitores',    desc: 'wmic desktopmonitor',                           type: 'cmd',    cmd: 'wmic desktopmonitor get Name,Status,ScreenHeight,ScreenWidth', tip: 'Lista monitores detectados pelo Windows' },
      { name: 'DirectX Diagnostic',      desc: 'dxdiag',                                       type: 'path',   cmd: '%SystemRoot%\\System32\\dxdiag.exe', tip: 'Diagnostico completo de video, audio e DirectX' },
    ]
  },
  {
    id: 'desinstalar',
    name: 'Desinstalar',
    sub: 'remocao de software',
    cmds: [
      { name: 'Desinstalar Office 2016', desc: 'wmic Office 2016 call uninstall',               type: 'cmd',    cmd: 'wmic product where "name like \'%Office%2016%\'" call uninstall', tip: 'IRREVERSIVEL - confirme com usuario antes', dangerous: true },
      { name: 'Desinstalar Office 365',  desc: 'wmic Microsoft 365 call uninstall',             type: 'cmd',    cmd: 'wmic product where "name like \'%Microsoft 365%\'" call uninstall', tip: 'IRREVERSIVEL - confirme com usuario antes', dangerous: true },
      { name: 'Adicionar/Remover Progs', desc: 'appwiz.cpl',                                    type: 'path',   cmd: '%SystemRoot%\\System32\\appwiz.cpl', tip: 'Painel classico para desinstalar qualquer software' },
    ]
  }
]

// Fallbacks sem WMIC — aplicados automaticamente se wmic ausente
export const WMIC_FALLBACKS = {
  'wmic bios get serialnumber':                             'systeminfo',
  'wmic csproduct get UUID':                                'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
  'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize':  'systeminfo',
  'wmic path Win32_PNPEntity':                              'pnputil /enum-devices /problem',
  'wmic path Win32_VideoController':                        '%SystemRoot%\\System32\\dxdiag.exe|path',
  'wmic desktopmonitor':                                    'ms-settings:display|open',
  'wmic printer list':                                      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers" /s /v "Name" 2>nul | findstr /i "Name"',
}
