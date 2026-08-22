# TI Director Mode — Current State  

  

## Fotografia  

  

Data da auditoria: 2026-08-18.  

  

Fonte principal: ZIP fornecido pelo projeto.  

  

Fonte secundária: branch `main` do GitHub.  

  

## Versão  

Código:  

- package.json: 1.8.2
- interface: dinâmica — derivada de `app.getVersion()` via IPC `get-app-version` / `window.ti.getAppVersion()`

Histórico:

- CHANGELOG: 1.8.2
- última entrada: 2026-08-22

Artefato de Build:

- TI_DirectorMode_v1.8.2.exe

Versionamento unificado em 1.8.2. A versão exibida na UI (header do app e terminal) é derivada dinamicamente do `package.json` via Electron, eliminando hardcodes no renderer.

  

## Interface responsiva

A janela Electron preserva a dimensão padrão de 720 × 500 e possui dimensão mínima suportada de 480 × 380, definida nativamente no `BrowserWindow`.

O layout principal se adapta ao redimensionamento em tempo real:

- sidebar usa largura responsiva entre 110 e 160 pixels;
- terminal varia proporcionalmente entre 90 e 180 pixels de altura;
- todas as categorias permanecem acessíveis em 480 × 380, com scroll restrito à lista quando necessário;
- navegação entre categorias mantém a categoria ativa visível por acompanhamento automático de scroll;
- listas de comandos mantêm o comando selecionado visível durante a navegação para baixo, para cima e após troca de categoria, rolando somente o container interno;
- body e painel principal permitem encolhimento sem overflow horizontal global;
- Configurações e Deploy mantêm scroll vertical interno;
- modais respeitam os limites da viewport e usam scroll interno quando necessário;
- minimizar e restaurar permanecem funcionais;
- o controle "sempre no topo" consulta e confirma o estado nativo da janela via IPC, desativa corretamente a sobreposição e distingue visualmente os estados ativo e inativo; o comportamento foi aprovado em validação humana;
- dimensão ampliada foi considerada até 960 × 640 sem restrição máxima.

A revisão visual humana final aprovou o comportamento após as correções de acessibilidade das categorias e de acompanhamento da seleção nas listas internas. A TASK-02 não alterou funcionalidades operacionais de comandos, scripts, rede, IPC ou Deploy.

## Estado geral  

  

O produto possui uma arquitetura funcional e relativamente modular para o escopo atual.  

  

A aplicação possui:  

  

- Electron;  

- React;  

- IPC;  

- catálogo de comandos;  

- scripts de rollout;  

- configuração externa;  

- logging;  

- tratamento de processos;  

- suporte a UNC;  

- fallback WMIC.  

  

Não existe suíte de testes automatizados identificada.  

  

## Funcionalidades aparentes  

  

Funcionamento implementado:  

  

- alerta operacional não bloqueante no boot quando o hostname não corresponde à regex configurada;
- regex de hostname inválida é diferenciada de hostname incompatível;
- navegação entre categorias;  

- execução CMD;  

- abertura pelo Shell;  

- instalações configuráveis;  
- módulo Deploy (catálogo configurável e execução em lote);  
- mapeamento Soft;  
- Preparar máquina;  
- Inventário;  
- diagnóstico;  
- drivers;  
- configuração;  
- logging;  
- cancelamento de processos.  

  

## Estado da rede  

  

O projeto diferencia:  

  

1. unidade mapeada;  

2. acesso direto ao caminho UNC;  

3. autenticação de rede;  

4. abertura pelo Shell.  

  

Essa diferença é importante e não deve ser perdida.  

  

## Bugs conhecidos e status  

### BUG-001 — Preparar máquina nova (Resolvido)  

Histórico:
- Anteriormente, `SCRIPT_NOVA_MAQ` exigia passar pela etapa `ensureSoftMapped()` antes de executar o Office, o que causava bloqueios ou falhas de mapeamento desnecessárias.

Estado atual:
- **Resolvido e validado pelo usuário.**
- A dependência de mapeamento de rede (`ensureSoftMapped`, `net use`, unidade `S:` e credenciais) foi removida do fluxo de `Preparar máquina nova`.
- O fluxo agora é direto e otimizado:
  1. `getHostname()`
  2. Identificação dinâmica de ativo via prefixo configurado (`NOTEBOOK_PREFIX` / `NB`)
  3. `openOfficeInstaller()` para abrir o Office correspondente (Office 365 para Notebooks, Office 2016 para Desktops)
- `Mapear Soft (S:)` permanece mantendo o suporte a `ensureSoftMapped()` e mapeamento de rede.  

### BUG-002 — Janela em branco no boot / Alt+Tab (Resolvido)

Histórico:
- Ao iniciar a aplicação (tanto em desenvolvimento quanto no `.exe`), a janela aparecia como um quadro transparente ou em branco no Alt+Tab.

Causa e Solução:
- O hook `useEffect` do teclado em `App.jsx` acessava a variável `handleRunOrStop` em seu array de dependências antes da sua inicialização, gerando `Uncaught ReferenceError: Cannot access 'handleRunOrStop' before initialization` (TDZ do JavaScript) na montagem do componente.
- Os hooks e callbacks foram reordenados em estrita ordem de dependência.
- Foi adicionado fallback de carregamento do bundle local no `main.js`.
- Build gerado e validado (`release/TI_DirectorMode_v1.8.0.exe`).

### Usabilidade e Diagnósticos Aprimorados (v1.8.0)

1. **Aviso de "Sair sem salvar":**
   - Rastreamento de estado dirty em `SettingsPanel` (Configurações Gerais e Catálogo de Deploy).
   - Modal de confirmação (`UnsavedModal`) exibido ao tentar navegar (clique na Sidebar ou tecla `Tab`) quando houver alterações pendentes de salvamento.
   - Botão "Descartar" e badge visual de alterações pendentes.
2. **Diagnóstico inteligente de arquivos no Deploy:**
   - Detecção automática de extensões não executáveis (`.txt`, `.png`, `.pdf`, etc.) ou erro de comando não reconhecido no CMD.
   - Mensagem de erro explicativa orientando a troca para o tipo "Abrir arquivo (Shell)".
   - Banner de alerta em tempo real no formulário de cadastro de softwares.


  

## Hipótese atual  

  

A diferença mais importante entre os fluxos não é simplesmente o arquivo.  

  

É o pré-requisito de rede.  

  

Instalações:  

  

```text  

config  

↓  

caminho  

↓  

Shell/CMD  

↓  

arquivo  

```  

  

Preparar Máquina:  

  

```text

config

↓

hostname

↓

classificação por notebookPrefix

↓

Office 365 ou Office 2016

```

O fluxo permanece desacoplado de `ensureSoftMapped()`, `net use`, unidade `S:` e credenciais. A verificação operacional do padrão de hostname reutiliza a mesma leitura nativa, mas não interfere nessa classificação nem bloqueia a abertura do Office.

  

## Riscos  

  

### Alto  

  

1. scripts.js;  

2. mapeamento UNC;  

3. autenticação;  

4. processos filhos;  

5. diferenças entre acesso UNC e unidade.  

  

### Médio  

  

1. execução de instaladores;  

2. configuração dinâmica;  

3. códigos de retorno.  

  

### Baixo relativo  

  

1. navegação básica;  

2. renderização de categorias.  

  

## Testes  

  

Não há suíte automatizada identificada.  

  

Verificação sintática realizada durante auditoria:  

  

1. 10 arquivos JavaScript;  

2. 10/10 passaram em `node --check`.  

  

Isso não constitui teste funcional.  

  

## Alterações recentes  

  

CHANGELOG registra:  

  

1. configuração dinâmica;  

2. generalização multiempresa;  

3. correções de UI;  

4. abertura UNC pelo Shell;  

5. tratamento de caminhos com espaços;  

6. abertura de Office/Teams pelo Shell;  

7. ajustes em `net use`.  

  

## Divergência GitHub × ZIP  

  

O GitHub possui o commit público `c43738e` de 12/08/2026.  

  

O ZIP contém uma implementação mais extensa de `scripts.js`, incluindo:  

  

1. `runNetUseArgs`;  

2. `canAccessUnc`;  

3. `waitForUncAccess`;  

4. `ensureSoftMapped`;  

5. fallback híbrido;  

6. `cmdkey`.  

  

Portanto, o ZIP deve ser considerado a fonte primária do estado local desta auditoria.  

  

## Próximo passo  

- BUG-001 resolvido e validado.
- Manter `.ai/` sincronizado com novas melhorias ou correções solicitadas.


