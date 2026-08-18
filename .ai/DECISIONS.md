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

## DEC-006 — Preparar Máquina depende de rede

O script `SCRIPT_NOVA_MAQ` atualmente passa por uma etapa de preparação/acesso ao Soft antes de abrir o Office.

Essa dependência é comportamento atual e não deve ser removida sem autorização.

## DEC-007 — Ausência de testes automatizados

Não foi encontrada suíte automatizada no estado auditado.

Esta não é uma decisão idealizada; é uma característica observada do estado atual.

## DEC-008 — Estado local e estado publicado podem divergir

A auditoria identificou diferença entre o ZIP fornecido e o conteúdo publicado no GitHub.

O ZIP é a fonte primária para o estado local desta análise.

Nenhuma decisão deve ser baseada somente no GitHub enquanto essa divergência existir.