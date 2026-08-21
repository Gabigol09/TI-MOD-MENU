# TASK 07 — Endurecimento incremental da fronteira IPC de execução

**Prioridade:** P1 — segurança arquitetural  
**Dependência recomendada:** TASK 04  
**Esforço esperado:** médio/alto  
**Risco:** alto se feito como big-bang

## Contexto

O feedback técnico identificou como principal débito de segurança o fato de o renderer ainda possuir uma primitive ampla para solicitar execução de strings de comando. O catálogo atual já é parcialmente declarativo (`type`, `cmd`, `dangerous`, metadados), portanto não faz sentido substituir tudo por uma arquitetura nova de uma vez.

A melhoria deve ser incremental e preservar os comandos Windows que realmente dependem de `cmd.exe`.

## Objetivo

Reduzir gradualmente a capacidade do renderer de enviar linhas de shell arbitrárias e aproximar a fronteira IPC de intenções conhecidas pelo processo principal.

## Fase desta task

1. Inventariar todos os canais IPC capazes de iniciar processos/abrir recursos.
2. Identificar comandos simples do catálogo que podem ser referenciados por `commandId` em vez de enviar a string completa pela UI.
3. Introduzir um registry/allowlist no main para esse subconjunto.
4. Validar payloads recebidos.
5. Manter temporariamente o caminho legado apenas para fluxos não migrados e documentá-lo explicitamente.

## Contrato mínimo sugerido

Conceitualmente:

```text
renderer -> commandId + payload permitido
main     -> resolve commandId -> executable/args/estratégia -> executor
```

O formato exato deve respeitar a arquitetura atual.

## Integração com `commands.js`

O catálogo já existente deve ser aproveitado. Não duplicar uma segunda lista completa de comandos no main sem necessidade.

Se for necessário separar metadados de apresentação de informações de execução, fazer isso gradualmente e com testes.

## Segurança

- commandId desconhecido deve ser rejeitado;
- payload não previsto deve ser rejeitado ou normalizado de forma explícita;
- credenciais nunca entram em logs;
- `cmd.exe` continua permitido somente onde o comportamento atual realmente necessita dele;
- ações destrutivas continuam exigindo confirmação existente.

## Critérios de aceite

- [ ] Existe um caminho IPC por `commandId` para um subconjunto representativo de comandos.
- [ ] Main possui allowlist/registry explícito para os comandos migrados.
- [ ] Payload inválido é rejeitado com erro controlado.
- [ ] Testes cobrem commandId válido, inválido e payload inválido.
- [ ] Comandos migrados preservam comportamento.
- [ ] Fluxos ainda legados são documentados e não são removidos à força.
- [ ] Não ocorre refatoração big-bang de todos os comandos.

## Não fazer

- não migrar o projeto para TypeScript nesta task;
- não reescrever `processRunner` inteiro;
- não remover suporte a CMD;
- não mudar comandos funcionais apenas por estética;
- não transformar a task em decomposição geral de `App.jsx`/`scripts.js`.

## Saída obrigatória do agente

Ao finalizar, listar:

- comandos migrados;
- comandos ainda legados e motivo;
- novos contratos IPC;
- testes executados;
- riscos restantes;
- proposta para uma eventual fase 2, sem implementá-la automaticamente.
