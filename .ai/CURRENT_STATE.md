# TI Director Mode — Current State  

  

## Fotografia  

  

Data da auditoria: 2026-08-18.  

  

Fonte principal: ZIP fornecido pelo projeto.  

  

Fonte secundária: branch `main` do GitHub.  

  

## Versão  

  

Código:  

  

- package.json: 1.7.0  

- interface: v1.7.0  

  

Histórico:  

  

- CHANGELOG: 1.7.1  

- última entrada: 2026-08-11  

  

Build encontrado no ZIP:  

  

- TI_DirectorMode_v1.5.1.exe  

  

Existe inconsistência de versionamento entre código, changelog e artefato.  

  

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

  

- navegação entre categorias;  

- execução CMD;  

- abertura pelo Shell;  

- instalações configuráveis;  

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

  

## Bug em investigação  

  

### Preparar máquina nova  

  

Comportamento observado pelo usuário:  

  

- Instalações funciona;  

- arquivo TXT configurado em Instalações abre;  

- Scripts → Preparar Máquina tenta mapear recurso;  

- unidade/recurso não aparece mapeado;  

- arquivo configurado não abre.  

  

O código atual de `SCRIPT_NOVA_MAQ` exige passar pela etapa `ensureSoftMapped()` antes de executar o Office.  

  

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

ensureSoftMapped  

↓  

mapear S:  

↓  

validar acesso  

↓  

hostname  

↓  

Office  

```  

  

Portanto, se `ensureSoftMapped()` não retornar sucesso, o arquivo nunca chega à etapa de abertura.  

  

### Hipótese principal  

  

A falha mais provável está no fluxo de mapeamento/acesso UNC de `ensureSoftMapped()` e não na abertura do arquivo em si.  

  

Isso é especialmente provável porque o fluxo de Instalações pode abrir diretamente o mesmo caminho UNC sem exigir que S: esteja mapeado.  

  

### Estado da hipótese  

  

Ainda não confirmado.  

  

É necessário observar:  

  

1. código real retornado por `net use`;  

2. stdout/stderr;  

3. resultado de `net use`;  

4. acesso UNC;  

5. usuário;  

6. caminho efetivo;  

7. resultado do `fs.access`;  

8. etapa exata onde `ensureSoftMapped()` termina.  

  

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

  

Não modificar código.  

  

Coletar evidências do fluxo de rede e confirmar em qual etapa `ensureSoftMapped()` falha.  

