# TASK 09 — Integrar Preparar Máquina ao Deploy com baseline e reinicialização adiada controlada

**Prioridade:** P0 — operação / prevenção de erro humano
**Dependência:** TASK 08
**Esforço esperado:** médio/alto
**Risco:** médio

## Contexto

O módulo Deploy já possui catálogo configurável e execução sequencial.

A TASK 08 passa a garantir o preflight de hostname, com validação, correção guiada, distinção entre hostname ativo e hostname pendente, persistência mínima de estado e necessidade de reboot após rename.

Na operação real, porém, reiniciar imediatamente pode interromper a preparação de uma máquina nova antes das instalações básicas. Ao mesmo tempo, permitir seguir sem controle cria o risco de o técnico esquecer o reboot e continuar o processo com o hostname ainda não efetivado.

Esta task deve integrar Preparar Máquina ao Deploy sem duplicar executor e permitir adiar o reboot de forma controlada.

## Objetivo

Implementar o fluxo:

```text
Preparar Máquina
→ validar hostname
→ corrigir hostname se necessário
→ Windows confirma hostname pendente
→ escolher:
   - Reiniciar agora
   - Reiniciar depois
→ se "Reiniciar depois":
   - manter reboot pendente
   - mostrar aviso global
   - abrir Deploy
   - pré-selecionar baseline
   - técnico revisa
   - executar fila
   - ao final conduzir ao reboot
→ após reboot:
   - confirmar hostname ativo == esperado
   - limpar pendência
```

## Regra operacional principal

Se o hostname foi alterado, a máquina NÃO pode ser considerada completamente preparada enquanto:

```text
hostname ativo != hostname esperado
```

`Reiniciar depois` apenas posterga o reboot para permitir concluir o Deploy de preparação. Não elimina a obrigação.

## Estados mínimos

Reutilizar/evoluir o estado mínimo da TASK 08.

Estados conceituais aceitáveis:

```text
NORMAL
REBOOT_REQUIRED
REBOOT_AFTER_DEPLOY
```

Persistir apenas o necessário, por exemplo:

```text
expectedHostname
rebootRequired
rebootAfterDeploy
reason: hostname_change
```

Não persistir credenciais, tokens, dados de domínio, informações empresariais ou dados de rede desnecessários.

## Hostname ativo x pendente

Antes do reboot, um rename confirmado pode estar assim:

```text
activeHostname != expectedHostname
pendingHostname == expectedHostname
```

Isso significa: alteração aceita pelo Windows e reboot necessário.

Após o reboot:

```text
activeHostname == expectedHostname
```

Só então a pendência pode ser encerrada.

Nunca limpar a pendência porque o app reiniciou, porque o Deploy terminou ou porque o usuário clicou em algum botão.

## Ações após alteração do hostname

Após o Windows confirmar o hostname pendente:

```text
Hostname alterado com sucesso.

O Windows precisa ser reiniciado para ativar o novo hostname.

[ Reiniciar agora ]
[ Reiniciar depois ]
```

### Reiniciar agora

- exigir confirmação humana;
- usar mecanismo seguro já definido;
- nunca reiniciar silenciosamente.

### Reiniciar depois

Ao escolher:

- manter `rebootRequired = true`;
- marcar estado equivalente a `rebootAfterDeploy = true`;
- liberar apenas a continuação controlada para o Deploy;
- manter `expectedHostname`;
- exibir aviso global persistente de reinicialização pendente;
- não considerar o preflight concluído.

## Aviso global de reinicialização pendente

Enquanto houver pendência, exibir algo claramente visível em toda a aplicação:

```text
⚠ PENDENTE REINICIALIZAÇÃO
Hostname aguardando ativação: NB12345S
```

Requisitos:

- visível independentemente da categoria aberta;
- preferir Header/status já existente;
- não bloquear diagnóstico/consulta sem necessidade;
- sobreviver ao fechamento/reabertura;
- desaparecer somente quando `activeHostname == expectedHostname`.

## Integração com Deploy

`Preparar Máquina` deve usar o Deploy existente. Não criar segundo executor.

Fluxo:

```text
Preparar Máquina
→ preflight
→ Deploy existente
→ baseline pré-selecionado
→ revisão humana
→ iniciar fila
```

## Baseline configurável

Não hardcodar softwares em `App.jsx`.

Adicionar ao catálogo/configuração existente a menor extensão coerente para identificar itens de preparação, por exemplo:

```text
defaultForPreparation: true
```

ou equivalente.

Regras:

- uma única fonte de verdade;
- baseline configurável;
- itens opcionais continuam disponíveis;
- catálogo existente continua compatível;
- validação continua centralizada;
- nenhum nome empresarial específico no código.

## Pré-seleção

Ao entrar no Deploy através de `Preparar Máquina`:

- selecionar automaticamente itens baseline;
- deixar opcionais disponíveis;
- não iniciar automaticamente;
- permitir revisão e alteração manual antes da execução.

Ao abrir Deploy diretamente, preservar o comportamento normal atual. A pré-seleção automática deve depender da origem `Preparar Máquina`.

## Deploy com reboot pendente

Se `Reiniciar depois` foi escolhido:

- Deploy de preparação é permitido;
- aviso global permanece;
- estado de reboot não é limpo durante a fila;
- falha de item não remove pendência;
- conclusão individual de item não remove pendência.

## Final do Deploy com reboot pendente

Quando a fila terminar e ainda existir `rebootRequired = true`, exibir aviso obrigatório:

```text
Deploy concluído.

⚠ Há uma reinicialização pendente para concluir a alteração do hostname.

[ Reiniciar agora ]
[ Adiar ]
```

Pode haver contagem regressiva, desde que seja clara e cancelável, por exemplo:

```text
O computador será reiniciado em 60 segundos.

[ Reiniciar agora ]
[ Adiar ]
```

## Regra contra reboot silencioso

Mesmo que o usuário tenha escolhido `Reiniciar depois`, não reiniciar silenciosamente assim que o último item terminar.

Antes do reboot:

- avisar claramente;
- permitir salvar/fechar trabalho;
- permitir `Reiniciar agora`;
- permitir `Adiar`.

Se `Adiar`:

- manter indicador global;
- manter estado persistente;
- não marcar preparação como concluída;
- continuar lembrando da pendência sem criar scheduler complexo.

## Pós-reboot

Na próxima abertura:

1. ler estado pendente;
2. obter hostname ativo real;
3. comparar com `expectedHostname`;
4. se igual:
   - limpar `rebootRequired`;
   - limpar `rebootAfterDeploy`;
   - remover indicador;
   - liberar preparação;
5. se diferente:
   - manter pendência;
   - manter aviso;
   - informar inconsistência.

## Sem administrador

Preservar a UX corrigida na TASK 08:

- detectar ausência de privilégio antes de operação privilegiada;
- informar claramente que Administrador é necessário;
- não exibir erro genérico;
- não criar pendência falsa;
- não tentar rename/reboot esperando falhar depois.

## Segurança

- não aceitar comandos arbitrários do renderer;
- usar IPCs explícitos e payloads estritos;
- rejeitar campos extras;
- reutilizar endurecimento IPC existente;
- validar hostname no main;
- não persistir segredos;
- reboot sempre com intenção/aviso explícitos;
- respeitar política de sanitização do AGENTS.md.

## Compatibilidade

Preservar:

- Deploy existente;
- fila sequencial;
- entrada direta no Deploy;
- terminal/streaming;
- Configurações;
- validação central;
- Scripts não relacionados;
- TASK 08;
- IPC por commandId.

Evitar refatoração ampla.

## Critérios de aceite

- [ ] Preparar Máquina usa o Deploy existente.
- [ ] Não existe segundo executor.
- [ ] Baseline é configurável.
- [ ] Baseline entra pré-selecionado somente via Preparar Máquina.
- [ ] Itens opcionais permanecem disponíveis.
- [ ] Deploy não inicia automaticamente.
- [ ] Técnico revisa/edita seleção.
- [ ] Após rename existem `Reiniciar agora` e `Reiniciar depois`.
- [ ] `Reiniciar depois` mantém reboot obrigatório pendente.
- [ ] `Reiniciar depois` permite seguir ao Deploy de preparação.
- [ ] Existe indicador global `PENDENTE REINICIALIZAÇÃO`.
- [ ] Indicador sobrevive ao fechamento/reabertura.
- [ ] Deploy concluído não limpa pendência.
- [ ] Fim do Deploy com pendência gera aviso obrigatório.
- [ ] Reboot não ocorre silenciosamente.
- [ ] Usuário pode `Reiniciar agora` ou `Adiar`.
- [ ] `Adiar` mantém estado e indicador.
- [ ] Estado só é limpo quando hostname ativo == esperado.
- [ ] Fechar/reabrir sem reboot não limpa estado.
- [ ] Uso direto do Deploy continua funcionando.
- [ ] Falha de item não remove reboot pendente.
- [ ] Sem admin produz mensagem específica.
- [ ] Nenhum dado sensível é persistido.
- [ ] Payloads IPC inválidos são rejeitados.

## Testes automatizados recomendados

### Baseline

- catálogo sem baseline;
- um/múltiplos itens baseline;
- opcionais;
- entrada via Preparar Máquina;
- entrada direta no Deploy;
- configuração inválida.

### Estado de reboot

- rename confirmado → rebootRequired;
- `Reiniciar agora`;
- `Reiniciar depois` → rebootAfterDeploy;
- reabrir app mantém pendência;
- active antigo + pending esperado mantém pendência;
- active esperado resolve pendência;
- mismatch mantém aviso;
- `Adiar` não limpa estado.

### Deploy

- rebootAfterDeploy permite transição para Deploy;
- fila termina + reboot pendente → aviso final;
- fila termina sem reboot pendente → comportamento atual;
- falha de item não limpa reboot;
- reboot real sempre mockado em teste automatizado.

### IPC/segurança

- payload válido;
- inválido;
- campos extras;
- operação privilegiada sem elevação;
- renderer não envia comando arbitrário.

## Validação humana obrigatória

### Cenário A — hostname já válido

1. abrir Preparar Máquina;
2. confirmar hostname válido;
3. confirmar navegação ao Deploy;
4. confirmar baseline pré-selecionado;
5. confirmar que Deploy não inicia sozinho;
6. revisar/alterar seleção;
7. confirmar entrada direta no Deploy permanece normal.

### Cenário B — rename + Reiniciar depois

1. iniciar com hostname fora do padrão;
2. informar hostname genérico válido;
3. confirmar alteração;
4. confirmar hostname pendente no Windows;
5. escolher `Reiniciar depois`;
6. confirmar aviso global;
7. confirmar entrada no Deploy;
8. confirmar baseline;
9. executar fila em ambiente apropriado;
10. confirmar aviso obrigatório ao final;
11. confirmar ausência de reboot silencioso;
12. testar `Adiar`;
13. confirmar indicador persistente.

### Cenário C — reboot real

1. com pendência existente, usar `Reiniciar agora`;
2. autorizar reboot;
3. reabrir app;
4. confirmar hostname ativo real;
5. confirmar active == expected;
6. confirmar remoção da pendência e do indicador.

### Cenário D — sem administrador

1. executar sem elevação;
2. tentar fluxo que exige rename;
3. confirmar mensagem específica;
4. confirmar ausência de pendência falsa.

## Não fazer

- não ingressar em domínio;
- não automatizar domínio;
- não armazenar credenciais;
- não criar backend/banco/RMM;
- não criar telemetria;
- não duplicar catálogo;
- não hardcodar softwares corporativos;
- não reiniciar silenciosamente;
- não limpar pendência ao fim do Deploy;
- não limpar pendência só porque o app reiniciou;
- não criar scheduler complexo;
- não implementar preflight completo;
- não refatorar amplamente App.jsx.

## Documentação

Atualizar, se aplicável:

- `.ai/CURRENT_STATE.md`;
- `.ai/TASKS.md`;
- `.ai/DECISIONS.md`.

Registrar como contrato operacional, se adotado:

```text
Preparar Máquina
→ hostname
→ rename se necessário
→ reboot agora OU depois
→ Deploy de preparação
→ reboot obrigatório ao final quando pendente
→ confirmação pelo hostname ativo
```

README/CHANGELOG somente quando necessário no fechamento, sem detalhes internos ou sensíveis.

## Entrega esperada

Ao finalizar, informar:

- representação do baseline;
- representação do estado de reboot;
- funcionamento de `Reiniciar depois`;
- indicador global;
- integração Preparar Máquina → Deploy;
- diferenciação da origem do Deploy;
- comportamento no fim da fila;
- UX antes do reboot;
- comportamento de `Adiar`;
- condição exata para limpar estado;
- IPCs alterados/criados;
- arquivos alterados;
- testes adicionados;
- testes/build/checks;
- riscos restantes;
- validações humanas pendentes.

Não fazer commit ou push.
Não marcar como Validated.

## Resultado implementado

A implementação final reutiliza o Deploy sequencial existente e mantém o reboot de hostname persistente até `activeHostname == expectedHostname`. `Reiniciar depois` permite revisar o baseline configurável por `defaultForPreparation`; a entrada direta no Deploy não força baseline e nenhuma fila inicia automaticamente.

O resultado da fila diferencia sucesso, sucesso parcial, falha e cancelamento. Falhas ou cancelamentos não limpam a pendência; a ação de revisar Configurações aparece somente para erros classificados como path/configuração.

Contratos dos tipos do catálogo:

- Executável `.exe/.msi`: rastreado até o código de saída;
- Script `.bat/.cmd`: rastreado, com argumentos, saída integrada e suporte a Parar;
- Script com console visível: CMD interativo rastreado até o término real;
- Shell: abertura fire-and-forget, sem promessa de conclusão da instalação.

A validação automatizada final aprovou 141 testes em 13 arquivos, incluindo BATs temporários reais no Windows. A validação humana principal do fluxo foi concluída; o status formal externo não é alterado por este documento.
