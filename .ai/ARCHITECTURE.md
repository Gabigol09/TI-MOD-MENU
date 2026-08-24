# TI Director Mode — Architecture  

  

## Visão geral  

  

A aplicação é dividida em três áreas principais:  

  

```text  

src/  

├── main/  

├── renderer/  

└── shared/  

```  

  

## Main process  

  

### main.js  

  

Ponto principal do Electron.  

  

Responsabilidades:  

  

- BrowserWindow;  

- atalho global;  

- IPC;  

- execução de scripts;  

- configuração;  

- logging;  

- WMIC;  

- DISM;  

- operações da janela.  

  

### preload.js  

  

Bridge entre renderer e main.  

  

Usa `contextBridge`.  

  

Não fornece acesso direto do renderer ao Node.js.  

  

### processRunner.js  

  

Motor genérico de processos.  

  

Responsabilidades:  

  

- spawn;  

- exec;  

- CMD;  

- stdout/stderr;  

- tracking;  

- cancelamento;  

- taskkill;  

- códigos de retorno.  

  

### scripts.js  

  

Implementa automações de rollout.  

  

Principais scripts:  

  

- `SCRIPT_MAPEAR_SOFT`;  

- `SCRIPT_NOVA_MAQ`;  

- `SCRIPT_INVENTARIO`.  

  

Também contém a lógica de:  

  

- mapeamento de unidade;  

- acesso UNC;  

- autenticação;  

- abertura de Explorer;  

- espera por autenticação;  

- abertura do Office.  

  

### commandRegistry.js

Módulo puro CommonJS que centraliza a allowlist dos comandos migrados para execução por intenção. Valida envelope, rejeita IDs/payloads inesperados e retorna o comando literal associado, removendo a necessidade de o renderer enviar strings completas de shell pelo IPC para o subconjunto migrado.

### configLoader.js  

  

Carrega e salva `config.json`.  

  

Usa defaults e deep merge, valida a estrutura mesclada antes de aceitá-la e diferencia erro de JSON/leitura de configuração estruturalmente inválida.

### configValidator.js

Módulo puro CommonJS que centraliza regras determinísticas da configuração e retorna erros com campo e motivo. Não acessa rede, filesystem, Electron ou comandos. O renderer reutiliza essa autoridade por `validate-config` via preload/IPC, sem receber acesso direto ao Node.js.

  

### corporatePaths.js  

  

Converte configuração em caminhos consumidos pelo restante do backend.  

  

### adminCheck.js  

  

Verifica privilégios através de `net session`.  

  

Não implementa elevação automática.  

  

### wmicCheck.js  

  

Verifica disponibilidade funcional do WMIC.  

  

## Renderer  

  

### App.jsx  

  

Controlador principal da UI.  

  

Responsável por:  

  

- seleção;  

- execução;  

- scripts;  

- abertura de arquivos;  

- modais;  

- credenciais;  

- terminal;  

- eventos IPC.  

  

### Sidebar.jsx  

  

Seleciona categorias.  

  

### CommandPanel.jsx  

  

Exibe comandos da categoria atual.  

  

### SettingsPanel.jsx  

Edita configuração e gerencia catálogo de deploy (via sub-aba `DeploySettings.jsx`).  

### DeployPanel.jsx  

Aba Deploy: seleção múltipla, exibição de status em tempo real por item e acionamento de fila sequencial de instalação.  

### DeploySettings.jsx  

Sub-aba de Configurações para CRUD de categorias e softwares com teste integrado de caminhos.  

### Terminal.jsx  

Exibe saída dos processos.  

### Header.jsx  

Controles da janela.  

### WmicDialog.jsx  

Interface para o recurso WMIC.  

## Testes unitários

A suíte em `test/` usa Vitest em ambiente Node e cobre regras puras de `src/main` e `src/shared`.

```text
test/*.test.js
↓
Vitest
↓
helpers determinísticos CommonJS / ESM
```

Adaptadores de Electron, processos Windows, rede/UNC, credenciais e instalação permanecem fora da suíte unitária inicial.

## Shared  

### commands.js  

Catálogo de categorias e comandos.  

Define tipos como:  

- `cmd`;  
- `open`;  
- `path`;  
- `folder`;  
- `uri`;  
- `script`.  

### resolveCommand.js  

Aplica fallbacks relacionados ao WMIC.  

## Fluxo do controle sempre no topo

```text
App.jsx
↓
preload.getPinState() / preload.setPin()
↓
IPC invoke
↓
main.js
↓
BrowserWindow.isAlwaysOnTop() / setAlwaysOnTop()
↓
estado nativo confirmado no renderer
```

## Fluxo de comando  

```text  
Usuário  
↓  
React  
↓  
App.jsx  
↓  
preload.js  
↓  
Electron IPC (execute-command-by-id ou fallback run-cmd)
↓  
main.js (resolve pelo registry se por commandId)
↓  
processRunner.js ou scripts.js  
↓  
Windows  
```  

## Fluxo de Deploy  

```text  
DeployPanel.jsx (Usuário seleciona itens)  
↓  
handleExecuteDeploy() (Fila sequencial assíncrona)  
↓  
preload.runDeployItem(runId, item)  
↓  
IPC invoke 'run-deploy-item'  
↓  
main.js  
↓  
processRunner.runDeployItemTracked() / runDeployOpen()  
↓  
spawn('cmd.exe') ou shell.openPath()  
↓  
Streaming de logs via emitLine() -> 'cmd-line'  
↓  
Retorno do resultado e atualização dos badges na UI  
```  

## Fluxo de configuração  

```text  
SettingsPanel / DeploySettings  
↓  
window.ti.saveConfig()  
↓  
IPC  
↓  
configLoader.saveConfig()  
↓  
config.json  
```  

Os caminhos utilizados pelos scripts são obtidos através de:  

```text  
getPaths()  
```  

## Fluxo de instalação direta  

```text  
CommandPanel  
↓  
App.runCmd()  
↓  
startOpen()  
↓  
buildCmd(config)  
↓  
preload.runOpenPath/runOpen  
↓  
main.js  
↓  
shell.openPath() ou processRunner.runOpen()  
↓  
Windows  
```  

## Fluxo de script  

```text  
CommandPanel  
↓  
App.runCmd()  
↓  
startScript()  
↓  
runScriptNow()  
↓  
preload.runScript()  
↓  
IPC run-script  
↓  
scripts.js  
```  

## Fluxo de Preparar Máquina  

```text  
SCRIPT_NOVA_MAQ  
↓  
hostname  
↓  
Detecção de ativo (NOTEBOOK_PREFIX / NB vs PC / Desktop)  
↓  
openOfficeInstaller()  
↓  
Office 365 (Notebook) ou Office 2016 (Desktop)  
```  

  

## Fluxos críticos  

  

Os seguintes fluxos possuem maior risco:  

  

1. mapeamento de rede;  

2. autenticação UNC;  

3. execução de instaladores em caminhos de rede;  

4. comunicação IPC;  

5. cancelamento de processos;  

6. configuração dinâmica;  

7. abertura de caminhos com espaços.  

  

## Regra arquitetural  

  

A arquitetura documentada aqui representa o código existente.  

  

Não assumir que ela é a arquitetura ideal ou desejada para versões futuras.