# TASK 11 — Orquestração Geral de Preparação de Máquina

## Objetivo

Criar no TI Director Mode uma camada de **orquestração genérica de preparação de máquinas Windows** capaz de substituir, de forma gradual e configurável, scripts monolíticos `.bat/.cmd` usados em ambientes corporativos.

A implementação NÃO deve ser específica para uma empresa, servidor, conjunto de softwares ou script existente.

A meta é permitir representar workflows comuns como:

```text
pré-configuração
→ staging/cópia de arquivos
→ escolhas do técnico
→ Deploy
→ scripts auxiliares
→ pós-configuração
→ limpeza
→ resultado consolidado
→ reboot controlado
```

A TASK 11 deve aproveitar a infraestrutura já existente de:

- Preparar Máquina;
- validação de hostname;
- reboot pendente;
- Deploy;
- baseline;
- EXE/MSI rastreado;
- SCRIPT rastreado;
- SCRIPT com console visível;
- SHELL fire-and-forget;
- configuração compartilhada persistente;
- IPC endurecido;
- testes automatizados.

---

# 1. Problema a resolver

Scripts empresariais de preparação geralmente concentram em um único BAT:

- sincronização de horário;
- teclado/idioma;
- energia;
- criação de diretórios;
- cópia de instaladores;
- escolha de versões;
- instalação de vários programas;
- execução de scripts auxiliares;
- cleanup;
- hostname;
- reboot.

Esse modelo dificulta:

- manutenção;
- reutilização;
- diagnóstico;
- controle de erro;
- acompanhamento visual;
- alteração de um único passo;
- migração para outros ambientes;
- auditoria;
- parametrização.

O TI Director deve permitir decompor esse tipo de script em **etapas declarativas, configuráveis, rastreáveis e reutilizáveis**.

---

# 2. Regra arquitetural principal

NÃO converter BAT linha por linha para JavaScript.

Criar um **workflow simples de preparação por fases**.

Modelo conceitual:

```text
Preparar Máquina
        ↓
Preflight já existente
        ↓
Pré-Deploy
        ↓
Staging
        ↓
Choices / Variantes
        ↓
Revisão do Deploy
        ↓
Deploy existente
        ↓
Pós-Deploy
        ↓
Cleanup / Restore
        ↓
Resumo final
        ↓
Reboot existente
```

O motor de preparação deve **orquestrar**.

O Deploy continua sendo o executor de softwares.

---

# 3. Separação de responsabilidades

## Preparar Máquina

Continua responsável por:

- hostname;
- checagem administrativa;
- estado local;
- reboot;
- entrada no fluxo.

## Preparation Workflow

Responsável por:

- fases;
- ordem;
- ações de preparação;
- staging;
- choices;
- pós-configuração;
- cleanup;
- consolidação de resultados.

## Deploy

Continua responsável por:

- EXE/MSI;
- SCRIPT;
- console visível;
- SHELL;
- tracking;
- stdout/stderr;
- cancelamento;
- resultado da fila.

## Shared Settings

Responsável por persistir:

- perfil de preparação;
- paths;
- choices;
- staging;
- opções;
- referências ao catálogo.

## Local State

Continua separado.

NÃO mover para shared settings:

- rebootRequired;
- rebootAfterDeploy;
- expectedHostname;
- progresso específico da máquina atual.

---

# 4. Conceito de Perfil de Preparação

Adicionar uma estrutura configurável equivalente a:

```text
preparationProfile
```

Exemplo conceitual:

```json
{
  "preparationProfile": {
    "enabled": true,
    "preDeploy": [],
    "staging": [],
    "choices": [],
    "postDeploy": [],
    "cleanup": []
  }
}
```

A estrutura final pode variar para se adequar ao código existente.

Não criar workflow engine genérico.

---

# 5. Fases da primeira versão

Suportar fases equivalentes a:

```text
preDeploy
staging
choices
deploy
postDeploy
cleanup
```

Ordem previsível e linear.

Ramificações permitidas apenas quando simples, principalmente choices.

Não implementar DAG, dependências arbitrárias ou scheduler.

---

# 6. Estados dos passos

Cada passo deve possuir estado equivalente a:

```text
pending
running
success
error
cancelled
skipped
```

A UI deve conseguir apresentar esses estados de forma clara.

---

# 7. Política de erro

Cada passo configurável deve possuir política explícita equivalente a:

```text
blocking
nonBlocking
```

## Blocking

Se falhar:

- impede avanço para fase dependente;
- apresenta erro;
- permite revisão/retry quando apropriado;
- ainda executa restaurações obrigatórias.

## Non-blocking

Se falhar:

- registra erro;
- permite continuidade;
- aparece no resumo final.

Não deixar essa política implícita.

---

# 8. Registry de ações nativas

Criar um registry explícito de ações de preparação.

Exemplos candidatos:

```text
sync-time
configure-keyboard
save-power-settings
disable-sleep-temporarily
restore-power-settings
ensure-directory
remove-directory
copy-file
copy-directory
robocopy
```

A lista deve ser pequena e genérica.

NÃO criar:

```text
execute-any-command
run-arbitrary-powershell
```

---

# 9. Sincronização de horário

Adicionar ação opcional e genérica.

Ela deve:

- verificar/acionar serviço necessário;
- solicitar sincronização;
- registrar sucesso/falha;
- não depender de domínio;
- respeitar admin quando necessário.

Não hardcodar infraestrutura externa.

---

# 10. Teclado / idioma

Permitir configuração genérica.

Exemplo conceitual:

```json
{
  "action": "configure-keyboard",
  "language": "pt-BR",
  "inputMethod": "<valor-validado>"
}
```

Validação estrita.

Não hardcodar um layout como única possibilidade.

Se a implementação nativa ficar complexa demais, permitir SCRIPT rastreado como fallback nesta versão e documentar a limitação.

---

# 11. Energia temporária

Suportar o padrão:

```text
salvar configuração atual
→ aplicar política temporária
→ executar preparação
→ restaurar configuração
```

A restauração deve ser tentada mesmo após:

- falha;
- cancelamento;
- erro do Deploy.

Usar lógica equivalente a `try/finally`.

Não deixar a máquina permanentemente alterada por falha do workflow.

---

# 12. Staging de arquivos

Criar mecanismo genérico para preparar instaladores/arquivos localmente antes do Deploy.

Casos mínimos:

```text
copy-file
copy-directory
robocopy
```

Exemplo conceitual:

```json
{
  "name": "Pacote de exemplo",
  "source": "<shared-path>",
  "destination": "C:\\Support\\Package",
  "strategy": "copy-directory",
  "blocking": true
}
```

---

# 13. Regras de staging

O staging deve:

- validar source;
- validar destination;
- usar paths configurados;
- registrar início/fim;
- retornar resultado;
- impedir Deploy quando passo obrigatório falhar;
- não iniciar software automaticamente.

Não hardcodar UNC.

---

# 14. Robocopy

Se houver estratégia `robocopy`:

- interpretar corretamente códigos de saída do Robocopy;
- não assumir que qualquer código diferente de zero é erro;
- registrar resultado de forma legível;
- suportar cancelamento quando possível.

---

# 15. Choices / Variantes

Adicionar escolha simples configurável antes do Deploy.

Exemplo:

```text
Escolha a variante

○ Versão A
○ Versão B

[ Continuar ]
```

Choices devem servir para casos como:

- versões de pacote;
- alternativas de suíte;
- software opcional;
- perfil A/B.

Não codificar nomes específicos.

---

# 16. Modelo de choice

Exemplo conceitual:

```json
{
  "id": "productivity-suite",
  "label": "Versão do pacote",
  "required": true,
  "options": [
    {
      "value": "version-a",
      "label": "Versão A",
      "deployItems": ["package-a"]
    },
    {
      "value": "version-b",
      "label": "Versão B",
      "deployItems": ["package-b"]
    }
  ]
}
```

Regras:

- IDs únicos;
- opção obrigatória não pode ficar vazia;
- refs devem apontar para itens existentes;
- choice apenas altera seleção;
- choice NÃO inicia Deploy.

---

# 17. Integração com baseline

Preservar:

```text
defaultForPreparation
```

Seleção final do Deploy:

```text
baseline
+
choices
+
ajustes manuais do técnico
```

O técnico sempre revisa antes de iniciar.

Não autoexecutar a fila.

---

# 18. Integração com o Deploy existente

A nova camada NÃO pode criar segunda fila.

Preparation Workflow deve utilizar o executor/fila existente.

Esperado:

```text
workflow prepara seleção
→ abre/reutiliza Deploy
→ técnico revisa
→ técnico executa
→ resultado retorna ao workflow
```

---

# 19. Scripts auxiliares

Passos ainda não suportados nativamente devem poder ser representados por referências a itens SCRIPT existentes.

Exemplo conceitual:

```json
{
  "type": "deploy-item-ref",
  "itemId": "post-config-script",
  "blocking": true
}
```

Não criar outro executor.

---

# 20. Suporte a PowerShell

Avaliar extensão segura do SCRIPT para `.ps1` se ainda não existir.

Requisitos:

- path configurado;
- argumentos separados;
- tracking;
- exit code;
- cancelamento;
- sem command string arbitrária do renderer.

Se ficar fora de escopo, documentar e permitir fallback controlado.

---

# 21. Pós-Deploy

Permitir passos depois da fila.

Exemplos genéricos:

- script de configuração;
- ação de sistema;
- validação;
- restauração;
- limpeza.

O pós-Deploy deve receber o resultado da fila.

---

# 22. Cleanup

Permitir cleanup controlado.

Exemplos:

```text
remove-directory
remove-file
ensure-directory
```

Não permitir exclusão arbitrária de qualquer path informado pelo frontend.

Ações devem operar apenas sobre destinos validados/configurados.

---

# 23. Restore obrigatório

Diferenciar cleanup comum de restaurações obrigatórias.

Exemplo:

```text
restore-power-settings
```

deve ser tentado mesmo quando:

- staging falha;
- Deploy falha;
- usuário cancela.

---

# 24. Retry manual

Primeira versão:

- retry manual;
- sem retry automático complexo.

Quando aplicável, UI pode oferecer:

```text
[ Tentar novamente ]
[ Revisar Configurações ]
```

---

# 25. Cancelamento

O workflow deve respeitar cancelamento.

Se houver processo rastreado:

- staging;
- SCRIPT;
- Deploy;
- pós-script;

usar infraestrutura de cancelamento existente quando possível.

Após cancelar:

- estado = cancelled;
- não mostrar sucesso;
- executar restaurações obrigatórias;
- manter reboot pendente.

---

# 26. Resultado consolidado

Ao final, mostrar resultado por fase.

Exemplo:

```text
Preparação da máquina

Pré-Deploy
✓ Horário
✓ Teclado
✓ Energia

Staging
✓ Pacote A
✓ Pacote B

Deploy
✓ Aplicativo A
✗ Aplicativo B
✓ Aplicativo C

Pós-Deploy
✓ Configuração final

Cleanup
✓ concluído

⚠ 1 item requer revisão
⚠ Reinicialização pendente
```

---

# 27. Reboot

Preservar integralmente as regras existentes.

Preparation Profile NÃO executa:

```text
shutdown
restart-computer
```

diretamente.

Ao final, usar o fluxo existente:

```text
Reiniciar agora
Adiar
```

---

# 28. Hostname

NÃO implementar rename dentro do perfil.

Hostname continua responsabilidade de Preparar Máquina.

Scripts legados que incluam rename devem ser decompostos durante migração.

---

# 29. Configuração compartilhada

`preparationProfile` deve ser elegível para `ti-director-settings.json`.

Deve obedecer whitelist/validator existentes.

Não persistir runtime state do workflow em shared settings.

---

# 30. Estado de execução local

Se for necessário guardar progresso atual:

- usar estado local específico;
- não misturar com shared settings.

Nesta task, evitar resume complexo no meio do workflow.

---

# 31. UI de configuração

Adicionar editor simples do perfil.

Não criar workflow builder drag-and-drop.

Seções sugeridas:

```text
Pré-Deploy
Staging
Choices
Pós-Deploy
Cleanup
```

Permitir:

- adicionar;
- editar;
- remover;
- ordenar quando necessário.

---

# 32. UI de execução

Durante Preparar Máquina, apresentar progresso por fases.

Não substituir o terminal técnico.

A UI apresenta visão resumida.

O terminal continua contendo detalhes.

---

# 33. Segurança

Proibido no profile:

- comando arbitrário;
- shell arbitrário;
- PowerShell arbitrário vindo do renderer;
- credentials;
- tokens;
- secrets;
- paths de filesystem sem validação.

Renderer não deve controlar executable/path de comandos nativos.

---

# 34. Segredos

Scripts corporativos podem conter:

- keys;
- senhas;
- tokens;
- parâmetros privados.

NÃO migrar isso para shared settings em texto puro.

Não criar secret manager nesta task.

Registrar necessidade futura quando aplicável.

---

# 35. IPC

Novos IPCs devem:

- representar intenção específica;
- ter payload estrito;
- rejeitar campos extras;
- não expor filesystem genérico;
- não expor shell genérico.

---

# 36. Estrutura sugerida

Avaliar criação de módulos como:

```text
src/main/preparationWorkflow.js
src/main/preparationActions.js
src/shared/preparationProfile.js
```

Nomes podem variar.

Evitar concentrar tudo em:

```text
main.js
App.jsx
```

---

# 37. Config Validator

Estender validação central para:

- phases;
- action type;
- IDs;
- refs;
- choices;
- staging strategy;
- blocking;
- campos extras;
- enums;
- paths.

---

# 38. Compatibilidade com scripts legados

Migração deve poder ser incremental.

Exemplo:

```text
ação nativa
→ staging nativo
→ SCRIPT legado pequeno
→ Deploy
→ cleanup nativo
```

Não exigir conversão total de um BAT de uma vez.

---

# 39. Importação automática de BAT

FORA DE ESCOPO.

Não implementar:

- parser de BAT;
- leitura automática de `goto`;
- conversão automática para workflow;
- interpretação genérica de comandos.

Uma futura task pode explorar assistente de migração.

---

# 40. Cenário funcional de referência

A implementação deve demonstrar que um workflow genérico consegue representar:

```text
sincronizar horário
configurar teclado
salvar energia
desativar sleep temporariamente
criar staging
copiar arquivos
escolher variante
executar baseline
executar scripts auxiliares
restaurar energia
limpar staging
manter reboot pendente
```

Sem usar:

- empresa real;
- servidor real;
- share real;
- software interno real;
- chave real.

---

# 41. Fixture genérica

Criar fixture/test profile parecido com:

```text
Pré:
- sync-time
- save-power
- disable-sleep

Staging:
- copiar arquivo A
- copiar diretório B

Choice:
- variante A/B

Deploy:
- package-base
- package-choice

Post:
- script de configuração

Cleanup:
- restore-power
- remove-staging
```

---

# 42. Testes automatizados — Perfil

Cobrir:

- perfil válido;
- perfil inválido;
- action desconhecida;
- campos extras;
- refs inexistentes;
- choice inválida;
- strategy inválida;
- IDs duplicados.

---

# 43. Testes — Sequenciamento

Cobrir:

- ordem das fases;
- sucesso completo;
- blocking error;
- nonBlocking error;
- skipped;
- cancelamento.

---

# 44. Testes — Energia

Cobrir:

- salvar estado;
- aplicar temporário;
- restaurar após sucesso;
- restaurar após erro;
- restaurar após cancelamento.

---

# 45. Testes — Staging

Cobrir:

- copy-file;
- copy-directory;
- robocopy;
- source ausente;
- destination inválido;
- código Robocopy de sucesso;
- código Robocopy de falha;
- cancelamento.

---

# 46. Testes — Choices

Cobrir:

- required;
- opção válida;
- inválida;
- refs válidas;
- alteração de seleção;
- não autoexecuta.

---

# 47. Testes — Deploy

Cobrir:

- reutiliza fila existente;
- resultado retorna ao workflow;
- falha parcial;
- cancelamento;
- não cria executor paralelo.

---

# 48. Testes — Pós/Cleanup

Cobrir:

- ordem;
- blocking;
- nonBlocking;
- restore obrigatório;
- cleanup após sucesso;
- cleanup após erro conforme política.

---

# 49. Testes — Reboot/Hostname

Cobrir:

- reboot pendente permanece;
- erro não limpa;
- cancelamento não limpa;
- profile não executa reboot;
- profile não renomeia hostname.

---

# 50. Testes — Segurança

Cobrir:

- action desconhecida;
- payload extra;
- command arbitrário rejeitado;
- path inválido;
- renderer sem executable arbitrário;
- shared settings sem secrets/local state.

---

# 51. Testes manuais

Executar sem rede corporativa real.

Usar scripts e diretórios temporários.

## Cenário A — sucesso

```text
Pré
→ Staging
→ Choice
→ Deploy fake
→ Post
→ Cleanup
```

## Cenário B — staging blocking falha

Esperado:

- Deploy não inicia;
- erro claro;
- restore obrigatório ocorre.

## Cenário C — Deploy parcial

Esperado:

- resumo consolidado;
- pós/cleanup conforme regra;
- reboot preservado.

## Cenário D — cancelamento

Esperado:

- estado cancelado;
- processo encerrado;
- restore;
- sem falso sucesso.

## Cenário E — choice

Esperado:

- opção correta altera seleção;
- técnico revisa;
- fila não inicia automaticamente.

---

# 52. Documentação

Atualizar:

```text
README.md
.ai/CURRENT_STATE.md
.ai/ARCHITECTURE.md
.ai/TASKS.md
.ai/DECISIONS.md
```

Registrar arquitetura:

```text
Preparar Máquina
→ Preparation Workflow
→ Deploy
→ Post/Cleanup
→ Resultado
→ Reboot
```

README deve continuar público e simples.

---

# 53. Sanitização

Nenhum teste/documento/default deve conter:

- nome real de empresa;
- servidor real;
- domínio real;
- UNC real;
- path pessoal;
- hostname real;
- chave;
- token;
- credencial;
- software interno proprietário.

Usar placeholders.

---

# 54. Não fazer

Não:

- criar parser de BAT;
- criar conversor automático;
- criar banco;
- criar backend;
- criar API;
- criar serviço Windows;
- criar workflow engine genérico;
- criar DAG;
- criar scheduler;
- criar secret manager;
- armazenar secrets;
- fazer domain join;
- mover hostname para profile;
- mover reboot para profile;
- criar segundo executor de Deploy;
- expor comando arbitrário;
- hardcodar ambiente corporativo;
- refatorar projeto inteiro;
- fazer commit;
- fazer push;
- marcar Validated.

---

# 55. Critérios de aceite

A task está tecnicamente pronta para revisão quando:

- existe perfil de preparação configurável;
- fases são executadas em ordem;
- ações nativas mínimas funcionam;
- staging funciona;
- choices funcionam;
- baseline continua funcionando;
- Deploy existente é reutilizado;
- scripts legados podem ser usados como fallback;
- blocking/nonBlocking funciona;
- cancelamento funciona;
- restauração obrigatória funciona;
- resultado consolidado existe;
- reboot/hostname existentes são preservados;
- configuração compartilhada persiste o perfil;
- IPC continua restrito;
- testes passam;
- build passa;
- documentação está atualizada;
- sanitização foi revisada.

---

# 56. Validações técnicas obrigatórias

Executar:

```text
npm test
npm run build:renderer
node --check nos arquivos backend alterados
git diff --check
```

Revisar também:

```text
git status
git diff --stat
git diff
```

---

# 57. Entrega esperada

Ao final informar:

1. arquitetura final do Preparation Workflow;
2. formato final do profile;
3. fases implementadas;
4. actions registry;
5. ações nativas implementadas;
6. staging implementado;
7. choices implementadas;
8. integração com baseline;
9. integração com Deploy;
10. política blocking/nonBlocking;
11. comportamento em erro;
12. comportamento em cancelamento;
13. restore obrigatório;
14. integração com shared settings;
15. isolamento de local state;
16. IPCs criados/alterados;
17. arquivos alterados;
18. testes adicionados;
19. resultados de npm test/build/check;
20. documentação atualizada;
21. riscos/limitações;
22. itens de BAT empresarial que ainda exigiriam SCRIPT legado;
23. checklist humano final.

No OverClick:

- entregar como Done/Review;
- não marcar Validated.

Não fazer commit.
Não fazer push.
