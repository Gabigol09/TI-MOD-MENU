// Todos os comandos e categorias — espelho fiel da v1.5 AHK

export const CATEGORIES = [
  {
    id: 'rede',
    name: 'Rede',
    sub: 'mapear / diagnosticar / resetar',
    cmds: [
      { name: 'Mapear Soft (S:)',        desc: 'net use S: \\\\servidor.empresa.local\\soft',         type: 'script', cmd: 'SCRIPT_MAPEAR_SOFT',       tip: 'Mapeia S: pedindo usuario e senha TI' },
      { name: 'IP Config completo',       desc: 'ipconfig /all',                                 type: 'cmd',    cmd: 'ipconfig /all',             tip: 'Exibe todos adaptadores, IPs, MAC e DNS' },
      { name: 'Flush DNS',               desc: 'ipconfig /flushdns',                            type: 'cmd',    cmd: 'ipconfig /flushdns',        tip: 'Limpa cache DNS - resolve sites e pastas que param de abrir' },
      { name: 'Ping gateway',            desc: 'ping 192.168.1.1 -t',                           type: 'cmd',    cmd: 'ping 192.168.1.1 -t',       tip: 'Testa conectividade continua com o gateway' },
      { name: 'Ver mapeamentos',         desc: 'net use',                                       type: 'cmd',    cmd: 'net use',                   tip: 'Lista todas as unidades de rede mapeadas' },
      { name: 'Resetar adaptador',       desc: 'netsh int ip reset + winsock',                  type: 'cmd',    cmd: 'netsh int ip reset & netsh winsock reset', tip: 'Reseta pilha TCP/IP. Requer reboot apos executar' },
      { name: 'Remover perfil WIFI_CORP', desc: 'netsh wlan delete profile WIFI_CORP',            type: 'cmd',    cmd: 'netsh wlan delete profile name="WIFI_CORP"', tip: 'Remove perfil WiFi - resolve erros de certificado na reconexao' },
      { name: 'Sincronizar horario',     desc: 'w32tm /resync /force',                          type: 'cmd',    cmd: 'net stop w32time & net start w32time & w32tm /resync /force', tip: 'Sincroniza relogio - resolve erros de autenticacao no dominio' },
    ]
  },
  {
    id: 'impressoras',
    name: 'Impressoras',
    sub: 'spooler / drivers / filas',
    cmds: [
      { name: 'Resetar Spooler',         desc: 'stop + limpa fila + start',                     type: 'cmd',    cmd: 'net stop spooler & del /Q /F /S %systemroot%\\System32\\spool\\PRINTERS\\*.* & net start spooler', tip: 'Para spooler, limpa fila travada e reinicia' },
      { name: 'Gerenciar impressoras',   desc: 'printmanagement.msc',                           type: 'open',   cmd: 'printmanagement.msc',       tip: 'Console completo de impressoras e drivers' },
      { name: 'Listar impressoras',      desc: 'wmic printer list brief',                       type: 'cmd',    cmd: 'wmic printer list brief',   tip: 'Lista todas as impressoras instaladas' },
      { name: 'Painel impressoras',      desc: 'control printers',                              type: 'open',   cmd: 'control printers',          tip: 'Abre o painel de dispositivos e impressoras' },
    ]
  },
  {
    id: 'oracle',
    name: 'Oracle',
    sub: 'sqlplus / tns / conexao',
    cmds: [
      { name: 'Abrir SQLPlus',           desc: 'sqlplus /nolog',                                type: 'cmd',    cmd: 'sqlplus /nolog',            tip: 'Abre console SQLPlus sem login' },
      { name: 'Abrir TNSNames',          desc: 'notepad tnsnames.ora',                          type: 'open',   cmd: '%ORACLE_HOME%\\network\\admin\\tnsnames.ora', tip: 'Edita arquivo de configuracao de conexoes Oracle' },
      { name: 'Testar PR07',             desc: 'tnsping PR07',                                  type: 'cmd',    cmd: 'tnsping PR07',              tip: 'Testa se listener Oracle responde no PR07' },
      { name: 'Testar PR01',             desc: 'tnsping PR01',                                  type: 'cmd',    cmd: 'tnsping PR01',              tip: 'Testa se listener Oracle responde no PR01' },
      { name: 'Pasta Oracle Home',       desc: 'explorer %ORACLE_HOME%',                        type: 'open',   cmd: '%ORACLE_HOME%',             tip: 'Abre diretorio de instalacao do Oracle Client' },
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
      { name: 'Sobre o computador',     desc: 'ms-settings:about',                             type: 'open',   cmd: 'ms-settings:about',         tip: 'Abre Sistema > Sobre - hostname, UUID, processador, RAM' },
      { name: 'Uso de RAM',             desc: 'wmic OS get FreePhysical/TotalMemory',          type: 'cmd',    cmd: 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize', tip: 'RAM total e livre em KB' },
      { name: 'Servicos ativos',        desc: 'services.msc',                                  type: 'open',   cmd: 'services.msc',              tip: 'Console de gerenciamento de servicos' },
    ]
  },
  {
    id: 'instalacoes',
    name: 'Instalacoes',
    sub: 'softwares base Empresa / rollout',
    cmds: [
      { name: 'Office 365 (Notebook)',   desc: 'DeployTools\\TI\\OfficeSetup.exe',             type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\DeployTools\\TI\\OfficeSetup.exe', tip: 'Notebooks NB00000S - Office 365 atualizado' },
      { name: 'Office 2016 (Desktop)',   desc: 'Office2016_PRO.xml x64',                        type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Licenciados\\Midias Download\\Microsoft Office\\2016\\PRO\\PT-BR\\x64\\setup.exe /config \\\\servidor.empresa.local\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\Office2016_PRO.xml', tip: 'Desktops / mini PCs - Office 2016 Pro' },
      { name: 'Adobe Acrobat Reader',    desc: 'AcroRead.msi /q',                               type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\Adobe\\Acrobat Reader DC\\Binaries\\AcroRead.msi /q', tip: 'Leitor de PDF - obrigatorio em todas as maquinas' },
      { name: 'Google Chrome',           desc: 'ChromeSetup.exe /silent',                       type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\ChromeSetup.exe /silent /install', tip: 'Navegador padrao' },
      { name: 'Microsoft Teams',         desc: 'MSTeamsSetup.exe',                              type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\DeployTools\\TI\\MSTeamsSetup.exe', tip: 'Teams corrigido via DeployTools TI' },
      { name: 'Splashtop Streamer',      desc: 'Install.cmd Splashtop 3.8.0.4',                 type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\Splashtop\\Streamer 3.8.0.4\\Brazil Endpoints\\Install.cmd', tip: 'Acesso remoto - obrigatorio em todas as maquinas' },
      { name: 'PDF Creator',             desc: 'PDFCreator-4_4_3 /silent',                      type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\Pdf Creator\\PDFCreator-4_4_3-Setup.exe /silent', tip: 'Impressora virtual PDF' },
      { name: 'Greenshot',               desc: 'Install.cmd Greenshot 1.3.315',                 type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\Greenshot\\1.3.315\\Install.cmd', tip: 'Ferramenta de captura de tela' },
      { name: 'Notepad++',               desc: 'npp.7.7 x64 /S',                               type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Notepad++\\7.7\\x64\\npp.7.7.Installer.x64.exe /S', tip: 'Editor de texto avancado' },
      { name: 'Firefox ESR',             desc: 'Firefox 102.7.0esr /qn',                        type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Internet\\Firefox\\102.7.0\\Firefox Setup 102.7.0esr.msi /qn', tip: 'Navegador Firefox' },
      { name: 'Power BI Desktop',        desc: 'PBIDesktopSetup_x64.exe',                       type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\PowerBI Desktop\\2.153.1206.0\\Installer\\PBIDesktopSetup_x64.exe -quiet -norestart ACCEPT_EULA=1', tip: 'Power BI - instalar somente se solicitado' },
      { name: 'Citrix Workspace',        desc: 'Install.cmd Citrix 25.8.0.71',                  type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\Citrix\\Citrix Workspace\\25.8.0.71\\Install.cmd', tip: 'Necessario para acesso a sistemas legados' },
      { name: 'SAP Correcao',            desc: 'SAPSLTESP00 /silent',                           type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Sistemas\\SAP\\Client 7.40\\SAP_Text_Editor\\internal_patch.exe /silent', tip: 'Correcao obrigatoria do SAP' },
      { name: 'FlexNet Inventory',       desc: 'Install.cmd FlexNET',                           type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\FlexNET\\Flexnet Inventory Agent_21\\Package\\Install.cmd', tip: 'Agente de inventario de licencas' },
      { name: 'InventoryTool',           desc: 'InventorySetup /key:<CHAVE_REMOVIDA>',                   type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\InventoryTool\\1.0.18\\InventorySetup.exe /key:<CHAVE_REMOVIDA> /verysilent', tip: 'Sistema de inventario de ativos' },
      { name: 'CATIA Composer Player',   desc: 'EMBISD_Installer.exe (opcional)',                type: 'open',   cmd: '\\\\servidor\\dmuv5\\applications\\Install\\ComposerPlayer_R2026\\EMBISD_Installer.exe', tip: 'OPCIONAL - requer GBI instalado antes' },
      { name: 'GBI (pre-req CATIA)',     desc: 'pre_req.bat - pre-requisito',                       type: 'open',   cmd: '\\\\servidor.empresa.local\\SOFT\\Utilitarios\\DeployTools\\SoftwaresProjeto\\GBI\\pre_req.bat', tip: 'Instalar ANTES do CATIA Composer Player' },
      { name: 'Abrir pasta Soft',        desc: 'explorer \\\\servidor.empresa.local\\soft',            type: 'open',   cmd: '\\\\servidor.empresa.local\\soft', tip: 'Abre compartilhamento de software' },
    ]
  },
  {
    id: 'scripts',
    name: 'Scripts',
    sub: 'automacoes / rollout / batch',
    cmds: [
      { name: 'Preparar maquina nova',   desc: 'Soft > Office > Rollout Assistant',             type: 'script', cmd: 'SCRIPT_NOVA_MAQ',           tip: 'Mapeia Soft, detecta NB/Desktop, abre Rollout Assistant' },
      { name: 'Inventario do usuario',   desc: 'Sobre PC + Device ID + Programas',              type: 'script', cmd: 'SCRIPT_INVENTARIO',         tip: 'Abre 3 evidencias de rollout e solicita print' },
      { name: 'Limpar temporarios',      desc: 'del %temp%\\* /q /f /s',                        type: 'cmd',    cmd: 'del %temp%\\* /q /f /s',    tip: 'Apaga arquivos temporarios do usuario atual' },
      { name: 'Forcar GPO',             desc: 'gpupdate /force',                               type: 'cmd',    cmd: 'gpupdate /force',           tip: 'Aplica politicas de grupo imediatamente' },
      { name: 'Verificar integridade',   desc: 'sfc /scannow',                                  type: 'cmd',    cmd: 'sfc /scannow',              tip: 'Verifica e repara arquivos de sistema corrompidos' },
      { name: 'Remover SCCM',           desc: 'uninstall_agent.bat',                            type: 'open',   cmd: '\\\\servidor.empresa.local\\soft\\Utilitarios\\DeployTools\\SoftwaresBasicos\\uninstall_agent.bat', tip: 'Remove SCCM - executar durante rollout' },
    ]
  },
  {
    id: 'drivers',
    name: 'Drivers',
    sub: 'diagnostico / monitores / hardware',
    cmds: [
      { name: 'Gerenciador dispositivos', desc: 'devmgmt.msc',                                  type: 'open',   cmd: 'devmgmt.msc',               tip: 'Procure por ! amarelo ou ? (driver ausente)' },
      { name: 'Drivers com problema',    desc: 'pnputil /enum-devices /problem',                type: 'cmd',    cmd: 'pnputil /enum-devices /problem', tip: 'Lista dispositivos com erro de driver (CMD nativo — substitui WMIC no Win11)' },
      { name: 'Windows Update',          desc: 'ms-settings:windowsupdate',                    type: 'open',   cmd: 'ms-settings:windowsupdate', tip: 'Pode baixar drivers de monitor e chipset automaticamente' },
      { name: 'Placa de video',          desc: 'wmic Win32_VideoController',                    type: 'cmd',    cmd: 'wmic path Win32_VideoController get Name,DriverVersion,Status', tip: 'Mostra GPU e versao do driver' },
      { name: 'Informacao monitores',    desc: 'wmic desktopmonitor',                           type: 'cmd',    cmd: 'wmic desktopmonitor get Name,Status,ScreenHeight,ScreenWidth', tip: 'Lista monitores detectados pelo Windows' },
      { name: 'DirectX Diagnostic',      desc: 'dxdiag',                                       type: 'open',   cmd: 'dxdiag',                    tip: 'Diagnostico completo de video, audio e DirectX' },
    ]
  },
  {
    id: 'desinstalar',
    name: 'Desinstalar',
    sub: 'remocao de software',
    cmds: [
      { name: 'Desinstalar Office 2016', desc: 'wmic Office 2016 call uninstall',               type: 'cmd',    cmd: 'wmic product where "name like \'%Office%2016%\'" call uninstall', tip: 'IRREVERSIVEL - confirme com usuario antes', dangerous: true },
      { name: 'Desinstalar Office 365',  desc: 'wmic Microsoft 365 call uninstall',             type: 'cmd',    cmd: 'wmic product where "name like \'%Microsoft 365%\'" call uninstall', tip: 'IRREVERSIVEL - confirme com usuario antes', dangerous: true },
      { name: 'Adicionar/Remover Progs', desc: 'appwiz.cpl',                                    type: 'open',   cmd: 'appwiz.cpl',                tip: 'Painel classico para desinstalar qualquer software' },
    ]
  }
]

// Fallbacks sem WMIC — aplicados automaticamente se wmic ausente
export const WMIC_FALLBACKS = {
  'wmic bios get serialnumber':                             'systeminfo',
  'wmic csproduct get UUID':                                'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
  'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize':  'systeminfo',
  'wmic path Win32_PNPEntity':                              'pnputil /enum-devices /problem',
  'wmic path Win32_VideoController':                        'dxdiag|open',
  'wmic desktopmonitor':                                    'ms-settings:display|open',
  'wmic printer list':                                      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers" /s /v "Name" 2>nul | findstr /i "Name"',
}
