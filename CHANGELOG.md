# Changelog — TI Director Mode

Todas as mudanças relevantes do projeto.
Runtime **sem PowerShell** (CMD, WMIC, DISM, reg, net, pnputil e Shell nativo do Electron).

---
## [1.8.2] - 2026-08-22

### Adicionado

* **Alerta de hostname fora do padrão:** no boot, a aplicação avisa em vermelho quando o hostname não corresponde à regra configurada, sem bloquear o uso.
* **Validação segura de hostname:** hostname incompatível, indisponível, regra vazia e regex inválida são tratados separadamente, evitando alertas falsos.

### Corrigido

* **Controle sempre no topo:** o botão agora consulta e confirma o estado nativo da janela Electron, desativa corretamente a sobreposição e apresenta estados ativo/inativo mais claros.

### Técnico

* A leitura nativa do hostname passou a ser compartilhada entre a verificação no boot e o fluxo `Preparar Máquina`, preservando sua classificação por prefixo e a abertura do Office.
* Adicionada suíte unitária com Vitest para fallbacks WMIC, hostname, merge e validação da configuração e resolução de caminhos, sem dependência de infraestrutura corporativa ou Electron completo.
* Adicionado CI mínimo no GitHub Actions para executar `npm ci`, `npm test` e `npm run build:renderer` em pushes e pull requests para `main`; a primeira execução real foi confirmada com sucesso no GitHub Actions, mantendo o workflow verde.

---
## [1.8.0] - 2026-08-20

### Adicionado

* **Módulo Deploy (V1):** nova aba dedicada `🚀 Deploy` que permite montar um catálogo personalizado de softwares agrupados por categorias e executar a instalação em lote de múltiplos itens selecionados.
* **Seleção Múltipla e Acompanhamento em Tempo Real:** suporte a seleção de itens individuais e por categoria ("Marcar Todos" / "Desmarcar Todos") com badges de estado em tempo real (`Aguardando`, `Executando`, `Concluído`, `Erro`, `Interrompido`).
* **Gerenciador de Catálogo em Configurações:** sub-aba `🚀 Catálogo de Deploy` em Configurações permitindo criar, editar, reordenar e excluir categorias e softwares (com nome, tipo de execução, caminho UNC/local com validação pelo botão "Testar", argumentos e descrição).
* **Fila de Execução Sequencial e Segura:** processamento ordenado de softwares com streaming linha a linha no terminal e log em arquivo (`C:\Suporte\TIDirectorMode.log`), com suporte a cancelamento imediato pelo botão "PARAR".
* **Interface responsiva:** suporte real ao redimensionamento, preservando 720 × 500 como tamanho padrão e adotando 480 × 380 como viewport mínima suportada. Sidebar, terminal, painéis e modais se adaptam ao espaço disponível; categorias e comandos selecionados permanecem visíveis com acompanhamento automático de scroll quando necessário.

### Técnico

* Adicionado handler IPC `run-deploy-item` e métodos `runDeployItemTracked` / `runDeployOpen` no `processRunner.js`.
* Suporte a tipos de execução: Executável (`.exe`, `.msi`), Script (`.cmd`, `.bat`) e Abertura direta pelo Shell (`shell.openPath`).
* Preservação total de compatibilidade: as abas Instalações, Scripts e o fluxo de Preparar Máquina permanecem 100% inalterados e operacionais.
* Runtime sem PowerShell preservado.

---
## [1.7.3] - 2026-08-19

### Corrigido e Otimizado

* **Correção e otimização do fluxo 'Preparar máquina nova':** removida a dependência de mapeamento de rede (`net use`, unidade `S:`, `ensureSoftMapped` e solicitação de credenciais). A etapa de mapeamento anterior causava travamentos ou falhas de execução desnecessárias. Com a remoção dessa dependência, o fluxo executa de forma direta e otimizada (obtenção de hostname -> classificação do ativo -> abertura do instalador do Office correspondente).
* **Detecção dinâmica de ativos em Preparar Máquina:** a identificação de Notebook (`Office 365`) vs Desktop (`Office 2016`) utiliza dinamicamente o prefixo configurado (`notebookPrefix`), garantindo total aderência às configurações customizadas da empresa.
* **Diagnóstico aprimorado no botão Testar (Configurações):** validação de caminhos agora identifica e detalha a causa de falhas (diferenciando permissão/credenciais inválidas, arquivos não encontrados, servidor inacessível ou timeout), fornecendo orientações claras ao usuário.

---
## [1.7.2] - 2026-08-18

### Corrigido

* **Mapeamento do Soft no fluxo de scripts:** reforçado o fluxo de mapeamento da unidade configurada, evitando dependência de parsing do `cmd.exe` para credenciais e caminhos com caracteres especiais.
* **Acesso híbrido ao compartilhamento:** adicionada tentativa de acesso direto ao UNC, abertura pelo Explorer para autenticação nativa do Windows e validação posterior do acesso ao compartilhamento.
* **Fallback de credenciais:** adicionada tentativa alternativa utilizando `cmdkey` e `net use` quando o acesso inicial ao compartilhamento não é estabelecido.
* **Preparar máquina nova:** o fluxo passou a aceitar o compartilhamento UNC acessível mesmo quando a unidade não consegue ser mapeada, permitindo continuar até a identificação do ativo e abertura do Office.
* **Feedback de credenciais:** o fluxo de scripts passou a identificar quando a tentativa híbrida de acesso esgota as alternativas e solicitar novamente as credenciais.

### Técnico

* Execução de `net.exe` e `cmdkey.exe` diretamente via `spawn`, evitando parsing adicional do `cmd.exe` para os argumentos de rede.
* Adicionada validação de acesso ao UNC utilizando `fs.access()`.
* Adicionado polling temporizado para aguardar autenticação do compartilhamento pelo Windows.
* Preservado o runtime sem PowerShell.

---

## [1.7.1] - 2026-08-11

### Corrigido

- **Abrir pasta Soft em compartilhamento UNC:** o caminho configurado, por
  exemplo `\\servidor\soft`, era enviado ao `cmd.exe` como se fosse um
  executavel. Isso gerava erros como "O caminho da rede nao foi encontrado",
  embora o mesmo caminho abrisse pelo `Win+R`. Agora o app usa
  `shell.openPath()` do Electron, que delega a abertura ao Shell/Explorer
  nativo do Windows.
- **Aberturas que dependiam do Shell do Windows:** "Pasta Oracle Home",
  Office 365 e Microsoft Teams passam a usar `shell.openPath()` quando nao ha
  argumentos de instalacao. Variaveis como `%ORACLE_HOME%` sao expandidas antes
  da abertura e agora exibem uma mensagem clara se nao estiverem definidas.
- **Office 365 em caminho com espacos:** um instalador como
  `\\servidor\soft\Office 365\Setup.exe` era enviado ao CMD sem a abertura
  adequada e falhava em `\\servidor\soft\Office`. Agora ele e aberto pelo
  Shell nativo, portanto espacos no nome de pastas nao quebram a execucao.
- **Aberturas sem argumentos:** consoles `.msc`, `dxdiag`, `appwiz.cpl` e o
  instalador `.cmd` do Greenshot tambem passaram a usar `shell.openPath()`.
  O painel de impressoras agora usa a URI nativa `ms-settings:printers`.
- **Comandos de instaladores com argumentos:** os caminhos padrao de Office,
  Adobe, Chrome, PDF Creator, Notepad++, Firefox e Power BI receberam aspas,
  evitando que nomes de pastas com espacos sejam separados pelo CMD antes que
  a configuracao personalizada esteja carregada.
- **Paginas Configuracoes do Windows:** "Sobre o computador", "Windows
  Update" e os fallbacks de WMIC para URLs `ms-settings:` passam a usar
  `shell.openExternal()` em vez de serem enviados ao CMD.
- **TNSNames:** o comando agora chama explicitamente `notepad.exe` para editar
  o arquivo, em vez de tentar executar o `.ora`.
- **Unidade Soft configuravel:** a verificacao de unidade mapeada nao fica mais
  fixa em `S:`; ela usa a letra definida em Configuracoes. O comando `net use`
  tambem passa a colocar a unidade e o UNC entre aspas.

### Tecnico

- Adicionados os canais IPC `run-open-path` e `run-open-external`.
- O fallback de credenciais de rede foi preservado para caminhos UNC abertos
  pelo Shell. Se a abertura do compartilhamento realmente falhar, o app ainda
  pode pedir credenciais e tentar novamente.
- A identificacao de um caminho UNC configurado para o fallback de credenciais
  agora e case-insensitive, como o sistema de arquivos do Windows.
- Nenhuma correcao desta versao usa PowerShell: foram usados apenas o Shell
  nativo do Electron/Windows e CMD onde argumentos de instalacao sao
  necessarios.

---

## [1.7.0] — 2026-08-02

### Adicionado

- **Tela de Configurações** — nova categoria `⚙ Configurações` na interface:
  edita empresa, rede, padrão de hostname e o caminho de cada instalador
  direto pelo app, com botão "Testar" por caminho (confere se o arquivo
  existe antes de salvar) e validação ao vivo do regex de hostname.
  Mudanças aplicam no próximo comando, sem reiniciar o app.

### Alterado

- `config.json` agora pode ser editado de duas formas: pela tela de
  Configurações (aplica na hora) ou manualmente no arquivo (exige reiniciar
  o app, como antes).
- Removida a etapa de abrir uma ferramenta de pós-instalação de terceiros em
  "Preparar máquina nova" — o fluxo agora termina após abrir o instalador do
  Office correto para o tipo de máquina detectado. Um checklist de
  pós-instalação configurável está planejado para uma próxima versão.

### Técnico

- `corporatePaths.js` deixou de calcular os caminhos uma única vez na
  inicialização — agora expõe uma função que lê o `config.json` atual a
  cada chamada, o que tornou possível a tela de Configurações ter efeito
  imediato.
- Novos canais IPC: `get-config`, `save-config`, `test-path`.

---

## [1.6.1] — 2026-07-29

### Alterado

- Catálogo de comandos e `config.json` generalizados para uso por qualquer
  empresa: caminhos de servidor, unidades de rede e instaladores agora usam
  placeholders genéricos (`\\servidor\soft`) totalmente configuráveis, sem
  necessidade de recompilar.
- Categoria **Instalações** revisada para conter apenas software comum a
  qualquer ambiente corporativo (Office, navegadores, PDF, utilitários) —
  itens de nicho (ferramentas de CAD específicas, agentes de licenciamento
  proprietários) removidos do catálogo padrão.
- "Remover perfil WiFi" generalizado: em vez de um nome de perfil fixo, agora
  remove todos os perfis salvos — resolve o mesmo problema de certificado de
  forma mais abrangente e sem depender de nomenclatura de rede específica.

### Corrigido

- **Trava ao cancelar modal de credenciais:** o estado `running` era marcado
  como `true` antes de o app saber se o modal de credenciais ia aparecer.
  Cancelar o modal não desfazia isso, travando o botão em "PARAR"
  permanentemente e impedindo a execução de qualquer outro comando. Corrigido
  adiando o `running=true` para o momento em que o processo é realmente
  iniciado, e resetando o estado ao cancelar.
- **Janela minimizada bloqueava clique atrás dela:** o botão "Minimizar"
  alterava apenas o conteúdo React (colapsava a UI para a faixa de título),
  mas a janela nativa do Electron continuava no tamanho cheio (720x500),
  transparente e sempre no topo — capturando cliques na área "vazia".
  Corrigido: minimizar/restaurar agora redimensiona a janela real via novo
  canal IPC `window-set-collapsed`.

### Documentação

- `config.json` comentado (campos `_comment` em cada seção) explicando o que
  cada uma controla, incluindo o padrão de hostname usado por "Preparar
  máquina nova".
- Adicionado `LICENSE` (MIT) — antes ausente.

---

## [1.6.0] — 2026-07-23

### Adicionado

- **`config.json`** na raiz do projeto — arquivo de configuração editável sem recompilação.
  Qualquer empresa pode adaptar servidores, caminhos de rede, prefixos de hostname e
  caminho de log sem tocar em código JavaScript.

- **`src/main/configLoader.js`** — módulo que lê `config.json` em runtime com:
  - Busca automática do arquivo em múltiplos caminhos (dev, produção, ao lado do `.exe`)
  - Merge profundo (`deepMerge`) com valores default — programa não quebra se uma chave
    estiver ausente no JSON
  - Log no console indicando qual arquivo foi carregado

- **`src/main/corporatePaths.js`** refatorado — agora lê os caminhos do `config.json`
  via `configLoader` em vez de ter valores hardcoded. Interface de exportação mantida
  idêntica: `scripts.js` e `main.js` não precisaram de nenhuma alteração.

### Técnico

- Separação de **configuração vs código** (princípio 12-factor app / config externalization).
- Portabilidade: projeto agora funciona em qualquer ambiente sem modificar código-fonte.

### Documentação

- README atualizado com seção *Configuração* explicando o `config.json`.
- Estrutura de pastas atualizada para incluir `configLoader.js`.

---

## [1.5.1] — 2026-05-26

### Adicionado

- Logo TI Director (`build/icon.png` → `build/icon.ico`) aplicado no `.exe`,
  barra de tarefas e atalho portable.
- Script `npm run build:icon` (gera ICO multi-tamanho antes do build).

### Corrigido

- **Drivers com problema:** substituído `wmic path Win32_PNPEntity ...` por
  `pnputil /enum-devices /problem` — evita *"Nenhuma instância disponível"*
  no Windows 11.
- Fallback WMIC para dispositivos PnP alinhado ao mesmo comando `pnputil`.

### Adicionado

- **CHANGELOG.md** com histórico de versões.
- Configuração **electron-builder** para gerar portable em
  `release/TI_DirectorMode_v1.5.1.exe` (x64).

### Documentação

- README: seção *Gerar o .exe* com requisitos e aviso SmartScreen.

---

## [1.5.0] — 2026-05-25

### Lançamento inicial

- Launcher Electron + React (Vite) para suporte de TI em campo.
- Categorias: Rede, Impressoras, Oracle, Diagnóstico, Instalações, Scripts, Drivers,
  Desinstalar.
- Atalho global `Ctrl+Shift+F1`, janela always on top, minimizar em faixa, fixar (P).
- Navegação por teclado (Tab, setas, Enter) e terminal integrado com log em
  `C:\Suporte\TIDirectorMode.log`.
- Execução via **cmd.exe** com botão **PARAR** (`taskkill`).
- Janela abre no canto superior esquerdo (0, 0).
- Scripts: mapear Soft (S:), preparar máquina nova, inventário do usuário.
- Detecção de **admin** (`net session`) e **WMIC funcional** (`wmic path`).
- Fallbacks automáticos para comandos WMIC (reg, systeminfo, devmgmt, etc.).
- Modal de credenciais para `net use` — senha não aparece no log.
- Instalação opcional de WMIC via DISM com barra de progresso real.
- Confirmação para comandos irreversíveis (`dangerous: true`).
- Build portable Windows configurado (`npm run build`).
