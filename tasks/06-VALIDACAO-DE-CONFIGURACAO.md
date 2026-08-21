# TASK 06 — Validação consistente da configuração

**Prioridade:** P1 — confiabilidade  
**Dependência recomendada:** TASK 04  
**Esforço esperado:** médio  
**Risco:** médio

## Contexto

`config.json` é uma interface operacional pública do TI Director Mode. Hoje o projeto já possui defaults e algumas validações na UI, porém configurações incorretas precisam falhar cedo e com mensagens úteis, sem transformar indisponibilidade temporária de rede em erro estrutural de configuração.

## Objetivo

Criar uma camada única de validação determinística para a configuração e reutilizá-la no carregamento e na tela de Configurações.

## Escopo

Validar somente regras que possam ser determinadas localmente, por exemplo:

- tipos esperados das seções principais;
- formato da unidade configurada quando preenchida;
- regex de hostname válida;
- prefixes/regras de hostname coerentes com o formato atual;
- paths e argumentos como strings quando presentes;
- estrutura do catálogo Deploy, se ele estiver persistido no mesmo config;
- campos obrigatórios realmente necessários ao produto.

## Separar dois conceitos

### Validação estrutural

Exemplo: regex inválida, tipo errado, objeto ausente de forma incompatível.

Pode impedir o uso da configuração afetada e deve apontar campo + motivo.

### Teste operacional

Exemplo: UNC inacessível, servidor offline, credencial negada, arquivo inexistente.

Continua sendo responsabilidade do botão `Testar`/execução e NÃO deve tornar o arquivo de configuração estruturalmente inválido.

## Implementação

- Preferir função/módulo central de validação reutilizável.
- Não espalhar validações diferentes entre renderer e main.
- Se uma biblioteca de schema for proposta, justificar o custo. Uma solução pequena nativa é aceitável para o tamanho atual do config.
- Preservar deep merge/defaults e compatibilidade de configurações existentes sempre que possível.

## Critérios de aceite

- [ ] Config inválido identifica campo e motivo.
- [ ] Regex de hostname inválida é detectada explicitamente.
- [ ] Configuração válida atual continua carregando.
- [ ] Caminho de rede offline não é confundido com JSON/config estruturalmente inválido.
- [ ] Tela de Configurações reutiliza as mesmas regras determinísticas.
- [ ] Catálogo Deploy existente não sofre regressão.
- [ ] Existem testes unitários para regras principais.

## Não fazer

- não criar banco de dados;
- não versionar/migrar formatos complexos sem necessidade;
- não verificar rede durante cada boot como requisito de validade;
- não apagar campos desconhecidos do usuário automaticamente;
- não quebrar compatibilidade silenciosamente.

## Documentação

Documentar no README apenas regras públicas relevantes. Registrar decisões de compatibilidade em `.ai/DECISIONS.md` se houver mudança de contrato.
