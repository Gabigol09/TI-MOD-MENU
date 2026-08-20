# TASK — Remover dependência de mapeamento de rede do Preparar Máquina

## Contexto

O TI Director Mode possui dois fluxos diferentes relacionados a instalações:

1. A aba `Instalações`, que abre os caminhos configurados diretamente.
2. `Scripts → Preparar Máquina`, que atualmente passa por uma etapa de mapeamento de recurso de rede antes de identificar o tipo do ativo e abrir o Office.

A auditoria do estado atual identificou que o fluxo de `Preparar Máquina` possui uma dependência de `ensureSoftMapped()` / `net use` que não é necessária para a finalidade principal do script.

Essa dependência vem causando problemas recorrentes de mapeamento de unidade/recurso de rede e pode impedir que o fluxo chegue à abertura do Office.

## Decisão

Remover o mapeamento de rede da execução de:

`Scripts → Preparar Máquina`

O script NÃO deve mais depender de:

- `net use`;
- unidade `S:`;
- `ensureSoftMapped()`;
- autenticação/mapeamento de unidade;
- espera por mapeamento;
- Explorer usado exclusivamente para estabelecer o mapeamento.

## O que deve ser preservado

A lógica de identificação do ativo deve permanecer.

O comportamento esperado é:

```text
Preparar Máquina
    ↓
obter hostname
    ↓
identificar prefixo
    ├── NB → Notebook
    └── PC → Desktop
    ↓
abrir o Office correspondente
```

Não remover nem alterar a lógica existente de detecção por prefixo `NB` / `PC`, exceto se for estritamente necessário para desacoplar o mapeamento.

Também preservar:

- seleção de Office correspondente ao tipo de máquina;
- caminhos configurados em `config.json`;
- tratamento existente de abertura dos arquivos;
- mecanismos de abertura via Shell/CMD já existentes;
- códigos de retorno relevantes;
- comportamento das demais categorias;
- funcionamento da aba `Instalações`.

## Objetivo funcional

Depois da alteração, executar:

`Scripts → Preparar Máquina`

deve tentar realizar somente:

1. identificação do hostname;
2. classificação do ativo;
3. abertura do Office correspondente.

A execução não deve tentar criar ou validar uma unidade de rede antes disso.

## Credenciais e acesso ao caminho

As credenciais não devem ser removidas do sistema de configuração apenas por causa desta alteração.

O objetivo é separar:

### Preparar Máquina

Responsabilidade:

- detectar ativo;
- abrir Office.

### Configurações → Testar

Responsabilidade:

- verificar se o caminho configurado está acessível;
- detectar problemas de autenticação/acesso;
- informar claramente o usuário.

O botão de teste deve continuar sendo o local apropriado para validar previamente o acesso ao recurso configurado.

## Mensagem esperada para falha de autenticação

Quando for possível determinar que a falha ocorreu por credenciais inválidas/sem autorização para acessar o recurso, apresentar uma mensagem semelhante a:

> Credenciais inválidas ou sem permissão para acessar a pasta configurada. Abra o programa com credenciais que tenham acesso ao recurso.

A mensagem pode ser adaptada ao padrão visual/textual já existente no projeto.

IMPORTANTE:

Não classificar automaticamente qualquer erro de rede como "credenciais inválidas".

Diferenciar, quando possível:

- credenciais inválidas;
- acesso negado;
- servidor indisponível;
- caminho inexistente;
- timeout;
- outro erro de acesso.

Se o código atual não permitir diferenciar algum desses casos com segurança, preservar a informação técnica real do erro em vez de inventar a causa.

## Não-objetivos

NÃO fazer nesta task:

- reescrever o sistema de autenticação;
- criar um novo sistema de credenciais;
- alterar o formato do `config.json`;
- trocar CMD por PowerShell;
- alterar a arquitetura IPC sem necessidade;
- alterar a lógica de abertura do Office sem necessidade;
- modificar a aba Instalações;
- remover o botão de teste de configuração;
- remover suporte a caminhos UNC;
- remover a configuração de credenciais;
- fazer refatoração ampla de `scripts.js`;
- corrigir problemas não relacionados encontrados durante a implementação.

## Investigação obrigatória antes da alteração

Antes de editar código:

1. Ler `AGENTS.md`, se já existir.
2. Ler `.ai/PROJECT.md`, `.ai/ARCHITECTURE.md` e `.ai/CURRENT_STATE.md`, se já existirem.
3. Inspecionar o fluxo atual de `SCRIPT_NOVA_MAQ`.
4. Identificar exatamente onde `ensureSoftMapped()` é chamado.
5. Identificar exatamente onde ocorre a detecção `NB` / `PC`.
6. Identificar exatamente onde `openOfficeInstaller()` é chamado.
7. Identificar como o botão `Configurações → Testar` valida atualmente o caminho.
8. Identificar os códigos de retorno existentes para erros de rede/autenticação.

Não começar removendo funções simplesmente pelo nome.

Primeiro determinar quais funções são usadas por outros fluxos.

## Critério de segurança da alteração

Se `ensureSoftMapped()` ou funções relacionadas ao mapeamento também forem utilizadas por outras funcionalidades, NÃO removê-las globalmente.

A alteração deve desacoplar o mapeamento especificamente de `Preparar Máquina`.

Exemplo:

```text
Preparar Máquina
    X → ensureSoftMapped()

Outros fluxos que realmente dependem de mapeamento
    ✓ → continuam funcionando
```

## Critérios de aceite

### AC-01 — Preparar Máquina não mapeia unidade

Ao executar `Scripts → Preparar Máquina`, não deve ocorrer tentativa de:

```text
net use
```

para criar o mapeamento usado anteriormente pelo fluxo.

### AC-02 — Detecção de ativo preservada

O hostname deve continuar sendo obtido normalmente.

Prefixo:

```text
NB → Notebook
PC → Desktop
```

deve continuar determinando o fluxo correspondente.

### AC-03 — Office continua sendo aberto

Após identificar o tipo de ativo, o fluxo deve tentar abrir o Office configurado para aquele tipo.

### AC-04 — Sem dependência de S:

A ausência de uma unidade `S:` previamente mapeada não deve impedir o início do fluxo de Preparar Máquina.

### AC-05 — Configurações → Testar preservado

O teste de caminho deve continuar existindo e deve validar o acesso ao recurso configurado.

### AC-06 — Falha de autenticação informativa

Quando o erro puder ser identificado como credencial inválida ou acesso não autorizado, informar claramente o usuário.

Mensagem sugerida:

> Credenciais inválidas ou sem permissão para acessar a pasta configurada. Abra o programa com credenciais que tenham acesso ao recurso.

### AC-07 — Não mascarar outros erros

Servidor indisponível, caminho inexistente ou timeout não devem ser apresentados incorretamente como "credenciais inválidas".

### AC-08 — Instalações não sofrer regressão

O fluxo funcional da aba `Instalações` deve permanecer inalterado.

### AC-09 — Outros fluxos de rede não sofrerem regressão

Não remover funções de mapeamento/autenticação que ainda sejam utilizadas por outras funcionalidades.

### AC-10 — Validação

Executar pelo menos:

- validação/sintaxe dos arquivos alterados;
- build do projeto;
- testes existentes, caso existam;
- teste funcional do `Preparar Máquina`, se o ambiente permitir;
- teste do botão `Configurações → Testar`.

Registrar exatamente quais validações foram executadas e seus resultados.

## Documentação

Após a implementação, atualizar somente a documentação necessária.

Se o comportamento documentado anteriormente disser que `Preparar Máquina` depende de mapeamento de rede, corrigir essa documentação.

Atualizar `CHANGELOG.md` somente se a alteração for considerada relevante de produto conforme as regras do projeto.

Atualizar `.ai/CURRENT_STATE.md` se o harness já existir.

## Resultado esperado

O resultado final deve ser uma alteração pequena e focada:

```text
Preparar Máquina
    ↓
hostname
    ↓
NB / PC
    ↓
Office
```

sem:

```text
net use
S:
ensureSoftMapped
credenciais para mapeamento
```

no fluxo de Preparar Máquina.

Não alterar código fora do necessário para atingir esse comportamento.

Antes de finalizar, apresentar:

1. arquivos modificados;
2. funções modificadas;
3. fluxo antigo;
4. fluxo novo;
5. testes executados;
6. resultados;
7. eventuais riscos ou pontos que permaneceram sem confirmação.

Não declarar a task concluída sem evidência.