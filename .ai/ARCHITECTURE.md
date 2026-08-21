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

  

### configLoader.js  

  

Carrega e salva `config.json`.  

  

Usa defaults e deep merge.  

  

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
Electron IPC  
↓  
main.js  
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