# TASK 08 — Preparar Máquina v2: validação, correção de hostname e reinício obrigatório

**Prioridade:** P0 — operação / prevenção de erro humano
**Dependência:** TASK 03 e TASK 06
**Esforço esperado:** médio
**Risco:** médio/alto

## Contexto

O fluxo atual `Scripts → Preparar Máquina` foi criado antes do módulo Deploy e hoje possui sobreposição de responsabilidade com o fluxo moderno de preparação.

A aplicação já:

- identifica o hostname atual;
- possui regra configurável para hostname;
- alerta quando o hostname está fora do padrão;
- possui validação centralizada de configuração;
- possui módulo Deploy separado.

Na operação real existe um risco importante: um técnico pode alterar o hostname de uma máquina nova e continuar a preparação antes de reiniciar o Windows.

A alteração de hostname somente é efetivada completamente após reinicialização. Continuar o fluxo antes disso pode provocar erros operacionais posteriores, especialmente quando outras etapas dependem da identidade final da máquina.

O objetivo desta task é transformar `Preparar Máquina` em uma etapa de preflight enxuta, começando pelo hostname, sem criar ainda um preflight genérico com dezenas de verificações.

## Objetivo

Redesenhar o início do fluxo `Preparar Máquina` para:

1. obter o hostname atual;
2. validar usando a regra já configurada;
3. informar claramente quando estiver válido;
4. quando estiver inválido, oferecer correção guiada;
5. validar o novo hostname antes da alteração;
6. alterar o hostname somente após confirmação explícita;
7. após alteração bem-sucedida, impedir que o fluxo de preparação continue sem reinicialização;
8. permitir retomada segura após o reboot.

## Estratégia operacional

O hostname deve ser resolvido ANTES do Deploy.

Fluxo esperado:

```text
Preparar Máquina
      ↓
ler hostname
      ↓
validar configuração
      ↓
hostname válido?
   ├─ SIM → hostname aprovado → preparação pode continuar
   │
   └─ NÃO → apresentar correção guiada
                 ↓
           usuário informa novo hostname
                 ↓
           validar novo hostname
                 ↓
           confirmação explícita
                 ↓
           alterar hostname
                 ↓
           marcar reinício pendente
                 ↓
           BLOQUEAR continuação
                 ↓
           Reiniciar agora
```

Não encaminhar ao Deploy após uma alteração de hostname enquanto o Windows ainda não tiver sido reiniciado.

## Correção guiada de hostname

Quando o hostname atual estiver fora do padrão, exibir ao usuário pelo menos:

- hostname atual;
- indicação clara de que está fora do padrão;
- formato/template esperado;
- campo para novo hostname;
- validação antes da execução;
- confirmação antes de alterar o Windows.

Exemplo conceitual:

```text
Hostname atual:
DESKTOP-EXEMPLO

Status:
⚠ Fora do padrão

Formato esperado:
NB#####

Novo hostname:
[ NB12345 ]

[ Alterar hostname ]
[ Cancelar preparação ]
```

O template exibido deve derivar da configuração existente ou de extensão compatível dela.

Não duplicar regras de hostname no renderer.

## Reinício obrigatório no fluxo

Após uma alteração de hostname confirmada e executada com sucesso:

- não liberar Deploy;
- não executar automaticamente as próximas etapas de preparação;
- não exibir opção "continuar sem reiniciar";
- registrar que existe uma preparação aguardando reboot;
- apresentar ação clara `Reiniciar agora`;
- exigir confirmação antes de iniciar o reboot.

O reboot nunca deve acontecer silenciosamente.

Conceitualmente:

```text
Hostname alterado com sucesso.

Para continuar a preparação desta máquina,
é obrigatório reiniciar o Windows.

[ Reiniciar agora ]
[ Cancelar preparação ]
```

`Cancelar preparação` pode fechar/abandonar o fluxo, mas NÃO deve marcar a preparação como concluída nem liberar continuação do fluxo de Preparar Máquina.

## Estado pendente

Criar somente o mínimo necessário para identificar que houve alteração de hostname pendente de confirmação após reboot.

O estado não deve armazenar:

- credenciais;
- dados empresariais;
- informações de rede;
- segredos.

Pode armazenar somente dados mínimos como:

```text
preparação pendente
hostname esperado
motivo: hostname_change
```

A implementação exata deve respeitar a arquitetura existente.

## Retomada após reboot

Na próxima abertura do aplicativo, se existir preparação pendente:

1. obter novamente o hostname real;
2. comparar com o hostname esperado;
3. se corresponder:
   - considerar o reboot/alteração confirmados;
   - limpar o estado pendente;
   - permitir continuar Preparar Máquina;
4. se não corresponder:
   - manter o bloqueio;
   - informar claramente que a alteração ainda não foi confirmada.

Não assumir sucesso apenas porque o app foi reiniciado.

## Segurança

A alteração do hostname e o reboot são operações privilegiadas.

Regras:

- não aceitar comando arbitrário vindo do renderer;
- preferir intenção/IPC explícita e payload validado;
- validar o hostname no main antes de executar;
- rejeitar payload inesperado;
- não interpolar hostname diretamente em shell sem validação;
- reutilizar mecanismos existentes de execução segura quando apropriado;
- reboot exige confirmação humana explícita.

## Compatibilidade

Preservar:

- alerta de hostname implementado anteriormente;
- configuração existente;
- validação central;
- módulo Deploy;
- outros Scripts;
- terminal e streaming existentes.

A mudança deve substituir apenas a responsabilidade obsoleta do fluxo `Preparar Máquina`.

## Critérios de aceite

- [ ] `Preparar Máquina` verifica hostname antes de qualquer preparação posterior.
- [ ] Hostname válido permite continuar.
- [ ] Hostname inválido apresenta correção guiada.
- [ ] Novo hostname é validado usando a regra central existente.
- [ ] Hostname inválido não pode ser enviado ao Windows.
- [ ] Alteração exige confirmação explícita.
- [ ] Após alteração bem-sucedida, Deploy não é liberado antes do reboot.
- [ ] Não existe botão "continuar sem reiniciar" após renomear.
- [ ] Existe ação explícita `Reiniciar agora`.
- [ ] Reboot exige confirmação humana.
- [ ] Estado mínimo de reboot pendente sobrevive ao fechamento/reabertura.
- [ ] Após reboot, hostname real é verificado novamente.
- [ ] Estado pendente só é limpo quando o hostname esperado estiver efetivamente ativo.
- [ ] Falha ao alterar hostname não marca reboot como pendente.
- [ ] Falha ao reiniciar não marca preparação como concluída.
- [ ] Nenhuma credencial/dado sensível é persistido.
- [ ] Fluxos não relacionados continuam funcionando.

## Testes automatizados recomendados

Cobrir deterministicamente:

- hostname atual válido;
- hostname atual inválido;
- novo hostname válido;
- novo hostname inválido;
- regex/configuração inválida;
- alteração bem-sucedida → estado pendente;
- alteração falha → sem estado pendente;
- estado pendente + hostname esperado ativo;
- estado pendente + hostname diferente;
- payload IPC inválido;
- tentativa de continuar preparação com reboot pendente.

Mocks podem ser usados na fronteira Windows.

Não reiniciar a máquina real durante testes automatizados.

## Validação humana obrigatória

Em máquina de teste adequada:

1. abrir `Preparar Máquina` com hostname válido;
2. confirmar caminho normal;
3. testar hostname fora do padrão;
4. informar novo hostname válido;
5. confirmar alteração;
6. confirmar que o app NÃO oferece continuação ao Deploy;
7. confirmar mensagem de reboot obrigatório;
8. executar reboot real somente com autorização;
9. reabrir o aplicativo;
10. confirmar que o novo hostname é reconhecido;
11. confirmar que o fluxo então é liberado.

## Não fazer

- não ingressar máquina em domínio;
- não automatizar domínio;
- não armazenar credenciais;
- não executar reboot sem confirmação;
- não criar preflight completo de rede, drivers, domínio etc.;
- não implementar retomada genérica de workflow;
- não reescrever o módulo Deploy;
- não fazer refatoração ampla de App.jsx;
- não alterar automaticamente hostname sem ação humana;
- não permitir bypass de reboot dentro de Preparar Máquina.

## Documentação

Atualizar:

- `.ai/CURRENT_STATE.md`;
- `.ai/TASKS.md`;
- `.ai/DECISIONS.md` se a ordem hostname → reboot → Deploy virar contrato operacional.

README somente se existir comportamento público que realmente precise ser explicado.

## Entrega esperada

Ao finalizar, informar:

- fluxo implementado;
- estratégia usada para renomear;
- estratégia usada para estado pendente;
- mecanismo de reboot;
- IPCs criados/alterados;
- testes adicionados;
- testes executados;
- riscos restantes;
- itens que exigem validação humana.

Não fazer commit ou push.
Não marcar como Validated.
