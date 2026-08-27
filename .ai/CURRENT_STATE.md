# TI Director Mode — Current State  

  

## Fotografia  

  

Data da auditoria: 2026-08-18.  

  

Fonte principal: ZIP fornecido pelo projeto.  

  

Fonte secundária: branch `main` do GitHub.  

  

## Versão  

Código:  

- package.json: 1.8.4
- interface: dinâmica — derivada de `app.getVersion()` via IPC `get-app-version` / `window.ti.getAppVersion()`

Histórico:

- CHANGELOG: 1.8.4
- última entrada: 2026-08-27

Artefato de Build:

- TI_DirectorMode_v1.8.4.exe

Versionamento unificado em 1.8.4. A versão exibida na UI (header do app e terminal) é derivada dinamicamente do `package.json` via Electron, eliminando hardcodes no renderer.

  

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

  

Existe uma suíte unitária automatizada com Vitest, executada em ambiente Node sem iniciar Electron completo ou acessar infraestrutura corporativa.

A configuração possui validação estrutural central e determinística em `src/main/configValidator.js`, aplicada após defaults/deep merge no carregamento e reutilizada pela tela de Configurações via IPC restrito do preload. Erros identificam campo e motivo; tipos de seções, drive, regex de hostname, paths, argumentos e catálogo Deploy são protegidos sem consultar rede, filesystem ou comandos. Campos desconhecidos, configurações parciais suportadas e paths UNC/local como strings permanecem compatíveis.

A configuração efetiva segue três camadas separadas: defaults internos e `config.json` formam a base compatível; `ti-director-settings.json` aplica settings compartilháveis; `machine-preparation.json` permanece estado local em `userData`. No portable, o arquivo compartilhado fica ao lado do EXE original indicado pelo electron-builder; em desenvolvimento, na raiz do projeto; o fallback packaged usa a pasta de `process.execPath`. O store usa escrita atômica por arquivo temporário, hash para detectar conflito externo e estados `missing`, `ready`, `readOnly`, `conflict`, `invalid` e `unavailable`. Recarregar settings nunca acessa nem limpa o estado local de hostname/reboot.

  

## Funcionalidades aparentes  

  

Funcionamento implementado:  

  

- alerta operacional não bloqueante no boot quando o hostname não corresponde à regex configurada;
- regex de hostname inválida é diferenciada de hostname incompatível;
- navegação entre categorias;  

- execução CMD via commandId (comandos migrados) ou string fallback (legado não migrado);

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
- cancelamento de processos;
- orquestração de Preparação de Máquina.

## Fronteira IPC de execução

O renderer possui novo caminho seguro `execute-command-by-id` para um subconjunto inicial. O main valida o envelope, rejeita campos inesperados, exige `commandId` conhecido e resolve internamente o comando literal pelo registry `src/main/commandRegistry.js`; nenhum executable ou argumento livre atravessa esse contrato.

Comandos migrados nesta fase: `diagnostico.hostname`, `diagnostico.systeminfo`, `rede.ipconfig-all`, `rede.flush-dns` e `rede.list-mappings`.

O caminho legado (`run-cmd`, `run-open`, `run-open-path`, `run-open-external`, `run-deploy-item`) permanece temporariamente para comandos ainda não migrados, instaladores configuráveis, paths/URIs, fallback WMIC, scripts complexos e Deploy. `run-script` já usa allowlist por `scriptId`, mas payloads dinâmicos ainda exigem endurecimento futuro. CMD continua suportado; a redução é na capacidade do renderer de escolher strings arbitrárias para os comandos migrados.

## Encoding da saída de comandos Windows

O runner central decodifica os `Buffer`s de stdout e stderr dos comandos Windows usando CP850, página OEM confirmada no ambiente pt-BR validado, antes de enviar strings Unicode pelo IPC ao renderer. A decodificação é incremental e preserva caracteres e linhas divididos entre chunks; ASCII permanece compatível e UTF-8 pode ser selecionado explicitamente pelo decoder reutilizável.

O fluxo central cobre `runCmd`, `runCmdTracked`, `runOpen` e os processos diretos de rede reutilizados por scripts. Testes automatizados cobrem acentos pt-BR, amostras de `net use` e `systeminfo`, ASCII, UTF-8 explícito, stderr e flush sem newline. Execuções reais sanitizadas de `net use` e `systeminfo` confirmaram CP850 e preservação dos acentos.

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
- Anteriormente, `SCRIPT_NOVA_MAQ` dependia de mapeamento de rede e depois abriu instaladores de Office diretamente.

Estado atual:
- **Resolvido e validado pelo usuário no fluxo original.**
- A dependência de `ensureSoftMapped()`, `net use`, unidade mapeada e credenciais foi removida de `Preparar máquina nova`.
- O fluxo atual substitui a abertura direta de Office por preflight de hostname, controle de reboot pendente e entrada opcional no Deploy existente.
- `Mapear Soft (S:)` permanece responsável pelo fluxo de mapeamento de rede.

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


  

## Fluxo operacional de Preparar Máquina e Deploy

```text
Preparar Máquina
↓
validar/corrigir hostname
↓
Reiniciar agora OU Reiniciar depois
↓
Deploy existente com baseline configurável para revisão
↓
reinício ainda obrigatório quando pendente
↓
activeHostname == expectedHostname
```

O fluxo permanece desacoplado de `ensureSoftMapped()`, `net use`, unidade mapeada e credenciais. `Preparar Máquina` é um preflight de hostname: consulta e valida no main, oferece correção guiada quando incompatível e nunca inicia a fila automaticamente. O técnico pode seguir ao Deploy após aprovar o hostname ou adiar explicitamente um reboot já pendente. O indicador global permanece visível enquanto a reinicialização estiver pendente.

Após rename confirmado pelo Windows, o aplicativo persiste em `userData` somente `pending`, `expectedHostname`, `reason: hostname_change` e `rebootAfterDeploy`. O técnico pode reiniciar imediatamente ou adiar de forma explícita; o adiamento autoriza somente a continuidade controlada pelo Deploy existente, mantém o aviso global e não conclui a preparação. Reabrir o aplicativo, terminar ou adiar o Deploy não remove a pendência: ela só é limpa quando o hostname ativo real corresponde ao esperado.

O resultado pós-Deploy classifica a fila por contagens reais: sucesso total, sucesso parcial, falha total, cancelamento ou itens apenas abertos. Erros marcados pelo executor como configuração/path oferecem navegação para Configurações; falhas técnicas permanecem como falhas operacionais e o terminal conserva a mensagem original. O modal mantém visíveis ao mesmo tempo o resultado da fila e a reinicialização de hostname pendente. O falso “Deploy concluído” em filas com erro e a regressão `proc is not defined` foram corrigidos; testes usam processos simulados e BATs temporários locais, sem instalar software.

Os tipos do catálogo possuem contrato explícito: Script aceita `.bat/.cmd` e Executável aceita `.exe/.msi`; ambos são rastreados, suportam cancelamento e só terminam no evento `close` do processo rastreado. Script integrado envia stdout/stderr ao terminal interno; com console visível, saída e interação pertencem ao CMD externo. Abrir pelo Shell usa a associação do Windows, não fornece processo/exit code confiável e por isso é fire-and-forget: aparece como aberto sem rastreamento e nunca como instalação concluída. O handler global de teclado ignora alvos editáveis, formulários principais solicitam foco inicial nativo e Enter no campo de hostname usa submit local somente para Validar.

Paths configurados são canônicos sem aspas externas. Entrada colada com um par completo de aspas é normalizada no main durante leitura, salvamento, Testar e execução; aspas incompletas ou comando/argumentos misturados ao campo path são rejeitados, e argumentos permanecem no campo próprio. Script/Executável usam `cmd.exe /d /s /c`, command line externa e `windowsVerbatimArguments: true`; BATs temporários reais sem espaços e com espaços/aspas confirmaram stdout e espera até o exit real. Script aceita `showConsole` booleano opcional, padrão falso: oculto usa pipes e decoder CP850 no terminal interno; visível rastreia um wrapper CMD oculto que usa `start /wait` para abrir e aguardar o CMD interativo, propagando término e permitindo `taskkill /T` pela árvore do wrapper. O terminal apenas ajusta scroll; não chama `focus`. Inputs, textareas, selects e contentEditable são explicitamente regiões `no-drag` e selecionáveis na janela frameless. Ao recolher a janela, o processo main reduz temporariamente o mínimo nativo de altura para o header antes de redimensionar e restaura 480 × 380 ao expandir; isso impede que o `BrowserWindow.minHeight` preserve espaço vazio.

Ao entrar no Deploy por Preparar Máquina, itens do catálogo marcados com `defaultForPreparation: true` são pré-selecionados uma única vez para revisão humana, sem iniciar a fila. A entrada direta no Deploy continua sem pré-seleção forçada. Ao fim da fila, se o reboot foi adiado, a interface exige nova escolha entre reiniciar agora e adiar, sem reboot silencioso e sem limpar o estado.

O fluxo também suporta `preparationProfile` compartilhável e opcional. As fases lineares `preDeploy`, `staging`, `choices`, `postDeploy` e `cleanup` orquestram actions nativas allowlisted e referências ao catálogo existente. Copy de arquivo/diretório, Robocopy, sincronização de horário, diretórios e energia temporária são nativos; idioma/teclado e PowerShell ficam como SCRIPT legado rastreado. Choices somam itens ao baseline para revisão sem autoexecução. Ações blocking impedem Deploy; nonBlocking continuam com erro visível. O mesmo runId e fila do Deploy preservam tracking/cancelamento. A energia usa cópia temporária do plano ativo e restauração obrigatória em cleanup, inclusive após erro/cancelamento.

O rename direto por `wmic.exe`, com `shell: false`, usa argumentos próprios de argv: o filtro seleciona o hostname atual obtido do Windows e o parâmetro do método é enviado como `name=NOVO_HOSTNAME`, sem transportar aspas de `cmd.exe`. A solicitação precisa encerrar com código zero e `ReturnValue = 0`; em seguida, o main consulta por `reg.exe`, com chave e valor fixos, o hostname configurado para o próximo boot e exige correspondência com o esperado. O hostname ativo, lido pelo comando nativo `hostname`, pode permanecer antigo antes do reboot; a pendência somente é removida quando o ativo corresponde ao esperado em uma abertura posterior. A validação humana confirmou o rename aceito e registrado como pendente no Windows. Sem elevação confirmada pela sonda existente `net session`, o rename não é iniciado e o modal explica que a correção automática exige Administrador. A implementação passou em 87 testes automatizados e aguarda validação humana pós-reboot e da UX sem elevação.

  

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

Runner: Vitest 2, escolhido por interoperar com os módulos CommonJS do processo principal e ESM de `src/shared` sem migrar a stack.

Estado validado:

1. 17 arquivos de teste;
2. 186 testes aprovados;
3. cobertura de configuração, store compartilhado, escrita atômica/conflito/read-only, paths canônicos, hostname ativo/pendente, estado de reboot, baseline, classificação da fila, encoding e executor de Deploy;
4. testes Windows criam BATs temporários reais para os modos integrado e console visível, incluindo tracking até `close` e cancelamento durante `pause`;
5. `npm test`, verificações `node --check`, `npm run build:renderer` e `git diff --check` aprovados.

Limitações atuais: não há E2E completo do Electron, acesso real a rede/UNC, credenciais ou instalação de softwares corporativos. Interação visual, reboot real e políticas do ambiente Windows continuam exigindo validação humana.

## Integração contínua

O workflow `.github/workflows/ci.yml` usa Node.js 20 e executa `npm ci`, `npm test` e `npm run build:renderer` em pushes e pull requests para `main`. O cache nativo de npm do `actions/setup-node` usa o `package-lock.json`; nenhum segredo ou recurso corporativo é necessário.

O full build portable permanece como validação local em Windows: embora aprovado localmente, depende de `electron-builder`, geração/aplicação de ícone e empacotamento Windows, portanto não integra os gates mínimos rápidos nesta primeira versão.

A primeira execução real do GitHub Actions após push para `main` foi confirmada com sucesso: checkout, configuração do Node.js, `npm ci`, `npm test` e `npm run build:renderer` foram aprovados, e o workflow permaneceu verde. O aviso sobre a migração do runtime interno das actions oficiais para Node.js 24 foi não bloqueante e não representa falha do projeto.

  

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


