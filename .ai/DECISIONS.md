# TI Director Mode — Decisions

## DEC-001 — Evitar PowerShell

O runtime do projeto foi desenhado para não depender de PowerShell.

Ferramentas nativas Windows e CMD são utilizadas.

Fonte:

- README;
- CHANGELOG;
- código atual.

## DEC-002 — Configuração externa

Caminhos corporativos foram removidos do código e centralizados em `config.json`.

Objetivo:

- permitir adaptação para diferentes ambientes;
- evitar recompilação;
- separar configuração de implementação.

## DEC-003 — Configuração dinâmica

`corporatePaths.js` utiliza `getPaths()` para obter os valores atuais do `configLoader`.

Isso permite que alterações feitas pela tela de Configurações tenham efeito no próximo comando.

## DEC-004 — Uso do Shell para caminhos

Caminhos que representam arquivos/pastas sem argumentos passaram a utilizar o Shell nativo do Electron/Windows.

Motivo documentado:

- UNC não deve ser tratado como executável pelo CMD;
- caminhos contendo espaços podem falhar quando enviados diretamente ao CMD.

## DEC-005 — Fallback WMIC

O projeto mantém fallback para ambientes onde WMIC não está funcional.

Drivers utilizam `pnputil /enum-devices /problem`.

## DEC-006 — Preparar Máquina desacoplado de mapeamento de rede

O script `SCRIPT_NOVA_MAQ` foi desacoplado de `ensureSoftMapped()`, `net use`, unidade `S:` e solicitação de credenciais por decisão explícita e autorizada.

O fluxo executa diretamente a identificação de hostname (com prefixo dinâmico de notebook) e a abertura do instalador do Office configurado, otimizando a execução e eliminando falhas desnecessárias de mapeamento.

## DEC-007 — Ausência de testes automatizados

Não foi encontrada suíte automatizada no estado auditado.

Esta não é uma decisão idealizada; é uma característica observada do estado atual.

## DEC-008 — Estado local e estado publicado podem divergir

A auditoria identificou diferença entre o ZIP fornecido e o conteúdo publicado no GitHub.

O ZIP é a fonte primária para o estado local desta análise.

Nenhuma decisão deve ser baseada somente no GitHub enquanto essa divergência existir.

## DEC-009 — Módulo Deploy com Catálogo Dinâmico e Fila Sequencial

A implementação da V1 do módulo Deploy adota:

1. **Catálogo configurável:** categorias e softwares estruturados em `config.json` e editáveis pela UI (sub-aba em Configurações), sem hardcode no fonte.
2. **Execução sequencial:** fila assíncrona processada item a item para evitar conflitos de múltiplos instaladores/MSI simultâneos no Windows.
3. **Preservação de legado:** as abas Instalações, Scripts e o fluxo de Preparar Máquina foram mantidos intactos e coexistindo com o Deploy.
4. **Despacho seguro de eventos IPC:** streaming de saída compatível com `IpcMainInvokeEvent` (`event.sender.send`) e `IpcMainEvent` (`event.reply`).

## DEC-010 — Minimum viewport as UI contract

480 × 380 é atualmente a menor viewport oficialmente suportada. Novas alterações visuais devem preservar a usabilidade nessa dimensão ou revisar explicitamente esse contrato.

## DEC-011 — Versionamento incremental por ciclo de tasks validadas

O projeto adota uma política operacional de incremento de versão baseada em ciclos de tasks concluídas e validadas.

### Regra

A cada **3 tasks concluídas e validadas por revisão humana**, incrementar o patch da versão em `+1`.

Exemplo:

```text
1.8.0
→ 3 tasks validadas
→ 1.8.1
→ mais 3 tasks validadas
→ 1.8.2
→ mais 3 tasks validadas
→ 1.8.3
```

Tasks apenas implementadas, em `IN PROGRESS` ou em `DONE / REVIEW` não contam para o incremento. A contagem considera somente tasks efetivamente validadas, e o patch só é incrementado depois que a terceira task do ciclo estiver validada.

### Histórico imutável

Versões anteriores representam histórico e não devem ser substituídas, renomeadas ou reescritas para refletir uma versão nova. Em particular, nunca substituir uma entrada histórica `1.8.0` por `1.8.1`, `1.8.2` ou qualquer versão posterior; cada versão nova deve ser adicionada como uma nova entrada.

Ao criar uma nova versão:

1. atualizar `package.json`;
2. sincronizar `package-lock.json`;
3. adicionar uma nova entrada ao `CHANGELOG.md`;
4. atualizar referências de estado atual em `README.md` e `.ai/`, quando aplicável;
5. preservar entradas históricas anteriores;
6. não criar release, tag ou publicação automática sem autorização explícita.

Referências antigas em documentação só devem ser alteradas quando representarem incorretamente o estado atual, nunca quando fizerem parte de histórico legítimo.

### Fonte de verdade para contagem

Antes de incrementar a versão, confirmar quais tasks pertencem ao ciclo e quais foram realmente validadas usando:

* `.ai/TASKS.md`;
* estado correspondente no OverClick, quando disponível;
* histórico Git, quando necessário.

Se houver divergência entre essas fontes, não incrementar automaticamente. Registrar a divergência e pedir revisão humana.

## DEC-012 — Vitest como runner da suíte unitária inicial

A suíte unitária usa Vitest porque o projeto combina módulos CommonJS no processo principal e ESM em `src/shared`. O runner permite testar ambos sem converter o projeto para ESM, TypeScript ou outra stack.

A cobertura inicial prioriza decisões puras e rápidas. Testes não devem depender de Electron completo, processos Windows reais, domínio corporativo, rede/UNC, credenciais ou instalação de software. Regras presas a I/O podem ter somente sua decisão pura extraída, preservando os adaptadores existentes.

## DEC-013 — CI mínimo multiplataforma e full build local

O CI inicial usa Node.js 20 em Ubuntu e limita os gates obrigatórios a `npm ci`, `npm test` e `npm run build:renderer`. Node 20 é a menor linha LTS compatível com a árvore instalada atual, que contém dependência com requisito Node >=20, e evita depender da versão mais nova usada apenas no ambiente local.

O full build portable não integra esta primeira versão do CI. Mesmo aprovado localmente, ele depende de `electron-builder`, geração e aplicação de ícone e empacotamento específico de Windows. Mantê-lo como validação local reduz tempo, custo e risco de falso negativo sem enfraquecer os gates de código do renderer e da suíte unitária.

O workflow não publica artefatos, não cria releases e não utiliza segredos, credenciais ou recursos corporativos.

## DEC-014 — Validação estrutural central e testes operacionais separados

A configuração usa um validator puro nativo no processo principal, sem biblioteca externa de schema. O carregador valida a configuração após aplicar defaults/deep merge, e o renderer reutiliza a mesma autoridade por um IPC restrito exposto no preload, preservando `contextIsolation` e sem acesso direto a Node.js.

A validação estrutural cobre somente tipos e formatos determinísticos do contrato atual. Disponibilidade de rede, credenciais e existência de arquivos permanecem testes operacionais explícitos e não invalidam paths UNC ou locais representados por strings. Campos desconhecidos não são rejeitados nem removidos, arrays do catálogo Deploy mantêm a semântica existente de substituição e seções opcionais continuam recebendo defaults.

## DEC-015 — Endurecimento IPC incremental por commandId

A fronteira de execução migra gradualmente de strings de shell fornecidas pelo renderer para intenções conhecidas (`commandId`) resolvidas por registry explícito no processo main. O novo contrato rejeita IDs desconhecidos, payloads não previstos e campos inesperados; o renderer não escolhe executable, linha CMD ou argumentos para comandos migrados.

A primeira fase cobre somente cinco comandos CMD determinísticos e de baixo risco. Os canais legados permanecem temporariamente para fluxos ainda não migrados, e não devem receber novas funcionalidades sem justificativa. CMD permanece suportado onde necessário; a decisão reduz quem pode escolher o comando, não elimina o mecanismo de execução existente.

## DEC-016 — CP850 na saída de comandos Windows pt-BR

Os processos Windows executados pelo runner entregam stdout e stderr como `Buffer` na página OEM do console. No ambiente pt-BR validado, `chcp` confirmou a página 850; portanto, o runner usa decodificação incremental CP850 antes de enviar strings Unicode pelo IPC.

A conversão é centralizada e compartilhada pelos comandos CMD e processos diretos de rede, preservando streaming, separação de stdout/stderr e fragmentos entre chunks. `iconv-lite` é dependência direta para não depender de pacote transitivo de build. ASCII é compatível com CP850; o decoder reutilizável aceita encoding explícito para fontes conhecidamente UTF-8.

## DEC-017 — Hostname antes da continuidade da preparação

`Preparar Máquina` é um preflight de hostname e não abre Office nem inicia Deploy automaticamente. Hostname incompatível deve ser corrigido por intenção explícita validada no main; após sucesso confirmado pelo Windows, Preparar Máquina e Deploy permanecem bloqueados até reboot e confirmação de que o hostname real corresponde ao esperado.

O estado transitório fica em `userData` e contém somente indicador pendente, hostname esperado e motivo `hostname_change`. Reabrir o aplicativo não confirma o reboot por si só. Rename e reboot usam executáveis e argumentos definidos no main, sem shell ou comando arbitrário do renderer, e cada operação exige confirmação humana explícita.

## DEC-018 — Deploy de preparação com reboot adiado controlado

Preparar Máquina direciona ao mesmo módulo e executor sequencial de Deploy já existente. A origem é efêmera no renderer e serve apenas para pré-selecionar, uma vez, itens do catálogo marcados por `defaultForPreparation: true`; a fila nunca inicia automaticamente e a entrada direta no Deploy não força baseline.

Após rename, `Reiniciar depois` persiste `rebootAfterDeploy: true` junto ao estado mínimo da TASK-08 e autoriza somente a continuidade controlada do Deploy. O aviso global e o estado sobrevivem ao fechamento, erros, cancelamento, conclusão da fila e Adiar. O fim do Deploy apenas oferece Reiniciar agora ou Adiar; a única condição de limpeza permanece `activeHostname === expectedHostname`.

## DEC-019 — Contratos de execução do catálogo Deploy

Executável (`.exe/.msi`) e Script (`.bat/.cmd`) são modos rastreados: o item permanece em execução até o processo terminar e o código de saída define sucesso ou erro. Script pode habilitar console CMD visível/interativo sem perder o tracking; o botão Parar encerra a árvore rastreada.

Abrir pelo Shell delega ao Windows em modo fire-and-forget. Esse modo confirma somente que o item foi aberto e nunca representa conclusão rastreada de instalação.

## DEC-020 — Configuração efetiva em três camadas

A configuração efetiva é composta por defaults internos/base compatível e settings compartilhados em `ti-director-settings.json`. Somente seções allowlisted de configuração entram no arquivo compartilhado; catálogo Deploy permanece único.

Estado de preparação, hostname esperado e flags de reboot permanecem exclusivamente no arquivo local em `userData`. O store compartilhado usa escrita temporária seguida de rename e hash para impedir overwrite concorrente silencioso. No portable, a localização usa `PORTABLE_EXECUTABLE_DIR`/`PORTABLE_EXECUTABLE_FILE` fornecidas pelo electron-builder antes do fallback em `process.execPath`, sem path controlado pelo renderer.

