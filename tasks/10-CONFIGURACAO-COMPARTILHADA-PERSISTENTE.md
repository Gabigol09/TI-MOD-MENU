# TASK 10 — Configuração Compartilhada Persistente

## Objetivo

Implementar uma camada de configuração compartilhada persistente para o TI Director Mode, permitindo que o aplicativo executado a partir de uma pasta de rede reutilize, entre diferentes máquinas e sessões, configurações editáveis como catálogo de Deploy, caminhos, categorias e defaults.

A implementação deve preservar a separação entre:

- **configuração compartilhada**, válida para todos que usam a mesma cópia do aplicativo;
- **estado local da máquina**, válido somente para o computador atual.

Não criar banco de dados, backend, API ou serviço central nesta task.

## Motivação

Hoje o aplicativo possui configuração editável, mas a intenção operacional é permitir que ele permaneça em uma pasta compartilhada de rede e que as configurações salvas continuem disponíveis na próxima execução.

Exemplo esperado:

```text
Pasta compartilhada
│
├─ TI_DirectorMode.exe
└─ ti-director-settings.json
```

O técnico configura caminhos e catálogo uma vez. Ao fechar e abrir novamente o aplicativo, ou ao abrir a mesma cópia em outra máquina, as configurações compartilhadas continuam disponíveis.

A atualização futura do executável não deve apagar essas configurações.

## Princípio arquitetural

Separar explicitamente três camadas:

```text
TI Director
│
├─ Defaults internos
│  └─ fallback seguro da aplicação
│
├─ Shared Settings
│  └─ configuração compartilhada ao lado do executável
│
└─ Local State
   └─ %APPDATA%\ti-director-mode
```

### Defaults internos

Continuam sendo a configuração padrão/fallback embarcada ou versionada com o projeto.

### Shared Settings

Devem persistir configurações compartilháveis, como:

- catálogo de Deploy;
- caminhos;
- categorias;
- propriedades como `defaultForPreparation`;
- opções de execução dos itens;
- demais ajustes globais comprovadamente compartilháveis.

### Local State

Deve continuar armazenando somente estado específico daquela máquina, por exemplo:

- `rebootRequired`;
- `rebootAfterDeploy`;
- `expectedHostname`;
- estado de preparação da máquina;
- qualquer outro estado operacional local.

**É proibido mover estado de hostname/reboot para a configuração compartilhada.**

## Arquivo compartilhado

Nome recomendado:

```text
ti-director-settings.json
```

O nome pode ser ajustado se a arquitetura atual justificar outro nome equivalente.

O arquivo deve ficar preferencialmente ao lado do executável em produção.

Em desenvolvimento, definir um comportamento previsível e testável sem depender de compartilhamento de rede real.

## Fluxo de carregamento

A configuração efetiva deve ser montada em camadas.

Fluxo esperado:

```text
defaults internos
      ↓
shared settings, se existirem
      ↓
validação
      ↓
configuração efetiva
```

Regras:

1. Carregar os defaults atuais.
2. Procurar o arquivo compartilhado.
3. Se não existir, continuar normalmente com os defaults.
4. Se existir, carregar somente após validação.
5. Combinar os valores de forma previsível.
6. Não aceitar configuração compartilhada inválida silenciosamente.
7. Não quebrar a inicialização do aplicativo por falha simples de leitura da pasta compartilhada.

## Localização do arquivo

A localização em produção deve ser derivada do executável/aplicação, não de um UNC ou servidor hardcoded.

Não incluir:

- servidor real;
- domínio interno;
- caminho corporativo real;
- nome empresarial.

Exemplo conceitual:

```text
<diretório-do-executável>\ti-director-settings.json
```

Avaliar corretamente diferenças entre:

- desenvolvimento;
- versão empacotada;
- portable;
- `process.execPath`;
- `app.getAppPath()`.

Escolher a opção que realmente represente a pasta da cópia executável em produção.

## Persistência

Ao usuário salvar uma configuração compartilhável:

1. validar antes de persistir;
2. gerar JSON determinístico e legível;
3. escrever primeiro em arquivo temporário;
4. garantir que a escrita terminou;
5. substituir o arquivo definitivo de forma atômica quando possível.

Exemplo conceitual:

```text
ti-director-settings.json.tmp
        ↓
validação/escrita completa
        ↓
rename/replace
        ↓
ti-director-settings.json
```

Evitar escrita direta que possa deixar JSON truncado em caso de interrupção.

## Concorrência

Considerar que duas instâncias podem usar a mesma configuração ao mesmo tempo.

Nesta primeira versão, não criar lock distribuído complexo.

Implementar proteção simples contra sobrescrita acidental.

Estratégia mínima recomendada:

- registrar a versão/assinatura/timestamp conhecido no momento da leitura;
- antes de salvar, verificar se o arquivo foi alterado externamente;
- se mudou, não sobrescrever silenciosamente.

Mensagem conceitual:

```text
A configuração compartilhada foi alterada por outra instância.

Recarregue as configurações antes de salvar novamente.
```

A implementação pode usar `mtime`, hash ou mecanismo equivalente simples e confiável.

## Modo somente leitura

A pasta compartilhada pode permitir leitura, mas não escrita.

O aplicativo deve diferenciar:

- configuração compartilhada disponível e gravável;
- configuração compartilhada disponível somente para leitura;
- configuração compartilhada indisponível.

Se o arquivo puder ser lido mas não salvo:

- continuar permitindo uso normal;
- não quebrar o aplicativo;
- informar claramente que as configurações compartilhadas estão em modo somente leitura.

Exemplo:

```text
Configuração compartilhada em modo somente leitura.

As configurações podem ser utilizadas, mas não podem ser alteradas nesta localização.
```

## UI de Configurações

Adicionar indicação discreta do estado da configuração compartilhada.

Exemplo conceitual:

```text
Configuração compartilhada
● Ativa

Origem: pasta do aplicativo
Última atualização: 25/08/2026 19:42

[ Recarregar ]
```

Quando gravável, a ação normal de Salvar pode persistir no arquivo compartilhado.

Não exibir caminho de rede completo se não for necessário.

Não poluir a interface.

## Recarregar

Adicionar uma ação explícita para recarregar a configuração compartilhada.

Ao recarregar:

1. ler novamente o arquivo;
2. validar;
3. atualizar a configuração efetiva;
4. atualizar a UI;
5. não alterar estado local de hostname/reboot.

Se houver edição local não salva, não descartar silenciosamente.

Implementar aviso ou bloquear a ação conforme o padrão atual de UX.

## Catálogo de Deploy

O catálogo atual deve continuar sendo a única fonte lógica de configuração de Deploy.

A persistência compartilhada deve reutilizar:

- `configLoader`;
- `configValidator`;
- modelo atual de catálogo;
- propriedades como `defaultForPreparation`;
- tipo de execução;
- opção de console visível, se existente.

Não criar um segundo catálogo.

Não duplicar estruturas de configuração.

## Compatibilidade

A implementação deve preservar configurações atuais.

Se `ti-director-settings.json` ainda não existir:

- o aplicativo deve continuar funcionando;
- não exigir migração manual;
- permitir criar o arquivo a partir da primeira gravação.

Configurações antigas compatíveis não devem ser descartadas sem motivo.

## Segurança

A configuração compartilhada é pública para quem tiver acesso à pasta.

Portanto, NÃO persistir nela:

- credenciais;
- senhas;
- tokens;
- chaves;
- cookies;
- dados pessoais;
- hostname/reboot local;
- informações sensíveis;
- segredos de infraestrutura.

Paths configurados podem ser persistidos quando fazem parte do uso normal do aplicativo, porém documentação e testes do repositório devem usar apenas placeholders genéricos.

## IPC

Se novos IPCs forem necessários, seguir o hardening já existente.

Regras:

- intenção explícita;
- payload estrito;
- campos extras rejeitados;
- renderer não envia caminho arbitrário do arquivo de configuração;
- localização do arquivo é definida no main;
- renderer não recebe primitivas de filesystem genéricas.

Exemplos conceituais aceitáveis:

```text
shared-config-get-status
shared-config-reload
shared-config-save
```

Os nomes finais podem seguir o padrão existente do projeto.

Não expor:

```text
read-file(path)
write-file(path, data)
```

## Estrutura sugerida

Preferir extensão incremental da arquitetura existente.

Avaliar reutilização/expansão de:

```text
src/main/configLoader.js
src/main/configValidator.js
```

Se necessário, criar módulo especializado, por exemplo:

```text
src/main/sharedConfigStore.js
```

Responsabilidades possíveis:

- resolver localização;
- ler;
- validar;
- persistir atomicamente;
- detectar alteração externa;
- informar status de leitura/escrita.

Não colocar toda a lógica em `main.js` ou `App.jsx`.

## Status esperado

A configuração compartilhada deve possuir um estado explícito equivalente a:

```text
missing
ready
readOnly
conflict
invalid
unavailable
```

Não é obrigatório usar exatamente esses nomes, desde que os estados relevantes sejam distinguíveis.

## Tratamento de falhas

### Arquivo inexistente

Continuar com defaults.

### JSON inválido

Não aplicar configuração parcial.

Informar erro claro e continuar com fallback seguro quando possível.

### Permissão negada na leitura

Continuar com defaults e informar indisponibilidade.

### Permissão negada na escrita

Manter configuração atual em memória e informar modo somente leitura/erro de persistência.

### Mudança externa antes de salvar

Bloquear sobrescrita silenciosa e pedir recarga.

### Falha durante arquivo temporário

Não substituir o arquivo válido existente.

## Testes automatizados

Adicionar testes determinísticos, sem rede corporativa real.

Cobrir pelo menos:

### Localização

- produção/portable, conforme abstração testável;
- desenvolvimento;
- nenhum UNC hardcoded.

### Leitura

- arquivo inexistente;
- arquivo válido;
- JSON inválido;
- permissão/erro de leitura simulado.

### Merge

- defaults sem shared settings;
- shared sobrescreve valor permitido;
- campo ausente preserva default;
- configuração inválida não é aplicada.

### Persistência

- grava arquivo temporário;
- substituição final;
- falha antes do rename preserva arquivo anterior;
- JSON salvo pode ser relido e validado.

### Concorrência

- sem alteração externa → salva;
- arquivo alterado externamente → conflito;
- conflito não sobrescreve arquivo.

### Somente leitura

- leitura funciona;
- escrita falha;
- status correto;
- aplicativo continua utilizável.

### Separação de estado

Confirmar que shared settings NÃO contêm:

- rebootRequired;
- rebootAfterDeploy;
- expectedHostname;
- estado local de preparação.

### IPC

- payload válido;
- payload inválido;
- campos extras;
- renderer não controla path do arquivo;
- nenhum IPC genérico de filesystem.

### Catálogo

- `defaultForPreparation`;
- tipos de execução;
- opções atuais do catálogo;
- reload mantém comportamento do Deploy.

## Validação manual

Executar pelo menos os seguintes cenários.

### Cenário A — primeira execução

1. remover/renomear arquivo compartilhado de teste;
2. abrir aplicativo;
3. confirmar uso dos defaults;
4. alterar configuração;
5. salvar;
6. confirmar criação do arquivo compartilhado.

### Cenário B — persistência

1. fechar aplicativo;
2. abrir novamente;
3. confirmar que catálogo/caminhos continuam configurados.

### Cenário C — segunda máquina/instância simulada

1. alterar shared settings;
2. abrir/recarregar em outra instância;
3. confirmar que nova configuração é carregada.

Pode ser simulado localmente em testes; não exigir rede corporativa real.

### Cenário D — conflito

1. abrir configuração;
2. alterar arquivo externamente;
3. tentar salvar pelo app;
4. confirmar que sobrescrita silenciosa é bloqueada.

### Cenário E — somente leitura

1. simular arquivo/pasta não gravável;
2. abrir app;
3. confirmar leitura;
4. tentar salvar;
5. confirmar mensagem clara;
6. confirmar que app continua utilizável.

### Cenário F — estado local

1. criar estado de reboot pendente;
2. recarregar shared settings;
3. confirmar que reboot/hostname local permanecem intactos.

## Documentação

Atualizar conforme necessário:

```text
.ai/CURRENT_STATE.md
.ai/ARCHITECTURE.md
.ai/TASKS.md
.ai/DECISIONS.md
README.md
```

Registrar claramente a separação:

```text
defaults internos
+
configuração compartilhada
+
estado local da máquina
```

No README, manter explicação pública e simples.

Não documentar:

- nomes empresariais;
- servidores reais;
- UNC reais;
- paths pessoais;
- credenciais;
- detalhes de OverClick/AGB/task interna.

## Não fazer

Não:

- criar banco de dados;
- criar API;
- criar backend;
- criar serviço Windows;
- criar autenticação;
- criar sincronização em nuvem;
- criar lock distribuído complexo;
- persistir hostname/reboot compartilhado;
- persistir credenciais;
- usar caminho corporativo hardcoded;
- implementar histórico de usuário nesta task;
- implementar telemetria;
- fazer refatoração ampla não relacionada;
- fazer commit;
- fazer push;
- marcar Validated automaticamente.

## Critérios de aceite

A task está tecnicamente pronta para revisão quando:

- configuração compartilhada pode ser lida;
- ausência do arquivo mantém defaults;
- alterações podem ser persistidas;
- escrita é atômica ou equivalente segura;
- conflito externo não sobrescreve silenciosamente;
- modo somente leitura é tratado;
- catálogo do Deploy continua sendo único;
- estado local permanece separado;
- IPC continua restrito;
- testes automatizados passam;
- build passa;
- documentação reflete a nova arquitetura;
- sanitização foi revisada.

## Validações técnicas obrigatórias

Executar:

```text
npm test
npm run build:renderer
node --check nos arquivos backend alterados
git diff --check
```

Revisar o diff integral antes da entrega.

## Entrega esperada

Ao final informar:

1. arquitetura implementada;
2. caminho resolvido para shared settings;
3. comportamento em desenvolvimento e produção;
4. estratégia de merge;
5. estratégia de escrita atômica;
6. estratégia de detecção de conflito;
7. comportamento read-only;
8. IPCs criados/alterados;
9. arquivos alterados;
10. testes adicionados;
11. resultados de npm test/build/check;
12. documentação atualizada;
13. riscos/limitações;
14. validações humanas ainda necessárias.

No OverClick:

- entregar como Done/Review;
- não marcar Validated.

Não fazer commit.
Não fazer push.
