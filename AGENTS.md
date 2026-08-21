# AGENTS.md — TI Director Mode

## Regra principal

Antes de modificar qualquer código, leia este arquivo e consulte os arquivos relevantes em `.ai/`.

O estado documentado em `.ai/` representa a memória operacional do projeto.

## Ordem de leitura

Antes de iniciar uma tarefa:

1. Leia `AGENTS.md`.
2. Leia `.ai/PROJECT.md`.
3. Leia `.ai/CURRENT_STATE.md`.
4. Leia `.ai/ARCHITECTURE.md` quando a tarefa envolver arquitetura ou fluxo entre módulos.
5. Leia `.ai/TASKS.md` para entender o trabalho conhecido.
6. Leia `.ai/DECISIONS.md` antes de alterar mecanismos existentes.

## Preservação

* Não remover funcionalidades existentes sem autorização explícita.
* Não alterar funcionalidades fora do escopo da tarefa.
* Preservar comportamento existente quando não houver requisito contrário.
* Não substituir uma implementação existente por uma arquitetura idealizada sem necessidade.
* Não assumir que a documentação está correta quando o código indicar o contrário.
* Quando documentação e código divergirem, registrar a divergência.
* Não inventar requisitos, comportamentos ou decisões.

## Código crítico

Tratar como áreas de risco elevado:

* `src/main/scripts.js`
* `src/main/processRunner.js`
* `src/main/main.js`
* `src/renderer/App.jsx`
* `src/main/configLoader.js`
* `src/main/corporatePaths.js`

Alterações nesses módulos devem considerar os fluxos IPC e os processos Windows envolvidos.

## Rede e UNC

Antes de alterar fluxos de rede, verificar:

* caminho UNC;
* unidade configurada;
* `net use`;
* identidade do processo;
* credenciais;
* diferença entre acesso UNC e mapeamento de unidade;
* execução como administrador;
* comportamento do Shell do Windows;
* códigos de retorno;
* stdout/stderr.

Não assumir que acesso UNC e unidade mapeada são equivalentes.

## Execução

O projeto foi construído para ambientes Windows corporativos e evita PowerShell.

Não introduzir PowerShell sem autorização explícita.

Antes de escolher comandos ou mecanismos de execução, considerar:

* `cmd.exe`;
* APIs do Node.js;
* Electron;
* Shell nativo do Windows;
* executáveis nativos já utilizados pelo projeto.

Não trocar o mecanismo de execução existente apenas por preferência técnica.

## Diagnóstico e validação

Durante investigação de erros, diferenciar explicitamente:

* **BUILD** — Vite, `npm run build`, `npm run build:renderer`, electron-builder e geração dos artefatos.
* **RUNTIME** — execução via `npx electron .`, execução do `.exe`, janela Electron, IPC e processos iniciados pela aplicação.
* **AMBIENTE/POLICY** — permissões, sandbox, políticas corporativas, AppLocker, antivírus, restrições do ambiente do agente ou outras limitações externas.

Uma falha em uma dessas categorias não deve ser automaticamente tratada como falha nas demais.

### Build confirmado

Se `npm run build` concluir com sucesso e gerar os artefatos esperados, considerar:

> BUILD = OK

Não modificar código apenas porque a aplicação não conseguiu executar corretamente dentro do ambiente do agente.

Se o build funcionar no terminal real do usuário, esse resultado tem prioridade sobre uma falha de build ou execução específica do ambiente do agente.

### Erros de ambiente ou policy

Erros contendo sinais como:

* `policy`;
* `permission denied`;
* `access denied`;
* `blocked`;
* `sandbox`;
* `execution policy`;
* `operation not permitted`;

devem ser avaliados primeiro como possível limitação externa.

Se o comando falhar no ambiente do agente, mas funcionar quando executado manualmente pelo usuário, registrar:

> Possível limitação ou policy do ambiente do agente. Problema não reproduzido no ambiente real do usuário.

Não alterar código da aplicação para contornar esse comportamento sem evidência de que o código é a causa.

## Proteção contra loops de diagnóstico

Não repetir indefinidamente sequências de:

`executar → ler log → editar → buildar → executar novamente`

O mesmo comando, teste ou sequência equivalente não deve ser executado mais de **2 vezes** sem que exista nova evidência ou uma nova hipótese verificável.

Após duas tentativas equivalentes sem informação nova:

1. interromper o ciclo;
2. classificar o problema como BUILD, RUNTIME ou AMBIENTE/POLICY;
3. resumir as evidências encontradas;
4. informar o último comando relevante;
5. indicar qual teste manual pode confirmar o diagnóstico.

Não continuar modificando arquivos apenas para tentar fazer o erro desaparecer.

## Regra antes de editar durante debugging

Antes de qualquer alteração de código motivada por um erro, responder internamente:

1. Qual erro concreto estou tentando corrigir?
2. Qual evidência relaciona esse erro ao código que pretendo alterar?
3. O que espero que a alteração prove ou corrija?
4. Como validarei o resultado?

Se não houver uma hipótese técnica clara, não alterar o código.

Especialmente em módulos críticos, não realizar alterações exploratórias sucessivas sem evidência.

## Critério de parada

Interromper o diagnóstico quando ocorrer qualquer uma destas situações:

* build concluído com sucesso;
* problema não reproduzido no ambiente real do usuário;
* evidência indicando limitação de policy/permissão externa;
* duas tentativas equivalentes sem nova informação;
* próxima ação seria apenas repetir um teste já realizado;
* não houver evidência suficiente para justificar nova alteração de código.

Ao parar, apresentar um resumo curto:

**Confirmado:** o que foi comprovado.

**Falhou:** o que efetivamente falhou.

**Classificação:** BUILD, RUNTIME ou AMBIENTE/POLICY.

**Próximo teste:** comando ou ação que o usuário pode executar para fornecer nova evidência.

Se o ambiente do agente apresentar erro, mas o mesmo build funcionar localmente, assumir como estado:

> O projeto compila corretamente no ambiente real. A falha observada parece específica ao ambiente de execução do agente. Não modificar o projeto para contornar essa limitação sem novas evidências.

## Princípio de mínima alteração

Durante debugging:

* diagnosticar antes de corrigir;
* corrigir apenas a causa identificada;
* evitar refatorações paralelas;
* não alterar módulos não relacionados;
* preservar código funcional;
* preferir uma alteração pequena e verificável;
* reverter alterações experimentais que não contribuíram para a solução.

Uma tentativa que não confirmou a hipótese não deve permanecer no código apenas porque aparentemente não causou problemas.

## Documentação contínua

A documentação em `.ai/` deve acompanhar o estado real do projeto.

Não deixar para atualizar a documentação apenas no final de grandes tarefas. Quando uma alteração relevante for confirmada e passar pela validação aplicável, atualizar a documentação correspondente antes de considerar a tarefa concluída.

Manter principalmente:

* `.ai/CURRENT_STATE.md` — estado atual realmente implementado e validado;
* `.ai/TASKS.md` — tarefas pendentes, concluídas, bloqueadas ou descobertas;
* `.ai/DECISIONS.md` — decisões técnicas que afetem implementações futuras;
* `.ai/ARCHITECTURE.md` — arquitetura e fluxos somente quando houver mudança estrutural;
* `.ai/PROJECT.md` — visão estável do projeto, evitando alterações por detalhes temporários.

A documentação deve representar o código existente, não intenções ainda não implementadas.

Não registrar como concluído algo que ainda não foi implementado ou validado.

Quando houver diferença entre documentação e código, considerar o código como evidência do estado implementado, investigar a divergência e corrigir a documentação quando apropriado.

## Atualização durante tarefas

Ao executar uma tarefa:

1. consultar a documentação relevante;
2. implementar a alteração;
3. validar o comportamento;
4. atualizar imediatamente os arquivos `.ai/` afetados;
5. registrar novas decisões técnicas relevantes;
6. atualizar o estado da tarefa;
7. verificar se a documentação continua consistente com o código.

Pequenas alterações internas que não mudem comportamento, arquitetura, decisões ou estado do projeto não precisam gerar documentação artificial.

Evitar documentação excessiva. Registrar informações que serão úteis para outro agente entender corretamente o projeto no futuro.

## Memória operacional do projeto

A pasta `.ai/` funciona como memória persistente para agentes.

Registrar nela informações que reduzam a necessidade de redescobrir:

* como funcionalidades importantes funcionam;
* decisões técnicas e seus motivos;
* limitações conhecidas;
* comportamentos já confirmados;
* problemas conhecidos;
* tarefas pendentes;
* resultados relevantes de diagnóstico;
* mudanças importantes já implementadas.

Não transformar `.ai/` em histórico completo de cada comando executado.

Logs extensos, tentativas descartadas e investigações temporárias devem ser resumidos apenas quando produzirem conhecimento útil para trabalhos futuros.

## Proteção de informações

Não registrar automaticamente em `AGENTS.md`, `.ai/`, comentários de código, fixtures, exemplos, commits ou outros arquivos persistentes informações pessoais, corporativas, confidenciais ou específicas do ambiente real.

Isso inclui, entre outros:

* nomes de pessoas;
* e-mails;
* usuários;
* senhas, tokens ou credenciais;
* nomes internos de empresas ou clientes;
* domínios internos;
* IPs internos;
* nomes reais de servidores;
* compartilhamentos UNC reais;
* caminhos corporativos identificáveis;
* números de patrimônio ou identificação de ativos;
* dados de máquinas específicas;
* informações de infraestrutura interna;
* informações que permitam identificar uma organização, pessoa ou ambiente.

Quando exemplos forem necessários, utilizar valores genéricos, por exemplo:

`\\servidor\compartilhamento`

`usuario@empresa.local`

`PC-EXEMPLO`

`192.0.2.x`

Nunca copiar automaticamente valores reais encontrados em logs, configurações ou código para a documentação.

## Autorização para informações sensíveis

Se uma informação pessoal, empresarial, interna ou potencialmente confidencial parecer necessária para documentação persistente, **não registrá-la automaticamente**.

Antes:

1. explicar brevemente qual informação seria registrada;
2. explicar por que ela seria útil;
3. pedir autorização explícita ao usuário;
4. somente após autorização, registrar o mínimo necessário.

Na ausência de autorização, usar descrição genérica ou placeholder.

Exemplo:

> A documentação desta decisão parece exigir registrar o nome real do compartilhamento corporativo. Posso armazenar esse valor em `.ai/CURRENT_STATE.md` ou prefere que eu mantenha como `<UNC_CORPORATIVO>`?

A ausência de resposta não significa autorização.

## Regra de minimização

Mesmo com autorização, registrar somente o necessário para compreender ou manter o projeto.

Preferir:

`O aplicativo acessa um compartilhamento UNC corporativo configurável.`

em vez de:

`O aplicativo acessa \\SERVIDOR-REAL\COMPARTILHAMENTO-REAL$ usando o ambiente da Empresa X.`

Informações específicas devem existir na documentação somente quando forem tecnicamente necessárias e explicitamente autorizadas.

## Responsabilidade ao finalizar uma tarefa

Antes de declarar uma tarefa concluída, verificar:

* código implementado;
* validação realizada;
* ausência de alterações fora do escopo;
* `.ai/CURRENT_STATE.md` atualizado quando necessário;
* `.ai/TASKS.md` atualizado;
* `.ai/DECISIONS.md` atualizado se houve nova decisão;
* `.ai/ARCHITECTURE.md` atualizado se houve mudança estrutural;
* nenhuma informação pessoal ou corporativa foi persistida sem autorização.

Uma tarefa que altere significativamente o estado conhecido do projeto não está completamente encerrada enquanto a memória operacional relevante estiver desatualizada.
