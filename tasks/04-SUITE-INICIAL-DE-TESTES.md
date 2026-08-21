# TASK 04 — Suíte inicial de testes automatizados

**Prioridade:** P0 — qualidade / maturidade de portfólio  
**Esforço esperado:** médio  
**Risco:** baixo

## Contexto

A principal lacuna de maturidade apontada no feedback técnico é a ausência de testes automatizados. O objetivo não é simular um domínio Windows inteiro, UNC real ou infraestrutura corporativa. A primeira suíte deve atacar regras puras, determinísticas e baratas de executar.

## Objetivo

Adicionar um runner de testes adequado à stack atual e cobrir as regras que possuem maior risco de regressão sem exigir Windows corporativo, credenciais, rede real ou instalação de software.

## Escopo inicial

Cobrir prioritariamente:

1. `resolveCommand` e fallbacks WMIC;
2. merge/defaults e validações determinísticas do `configLoader` que possam ser testadas isoladamente;
3. validação/classificação de hostname;
4. normalização/resolução de caminhos configurados quando houver função pura para isso;
5. mapeamentos de códigos/decisões determinísticas de execução existentes;
6. qualquer helper puro introduzido pelas Tasks 01–03.

## Runner

Escolher o runner com menor atrito para React/Vite + módulos CommonJS/ESM atuais. `Vitest` é aceitável se simplificar a interoperabilidade. Não converter o projeto inteiro para ESM ou TypeScript apenas para testar.

Adicionar scripts claros ao `package.json`, por exemplo:

```text
npm test
npm run test:watch
```

O nome exato pode ser ajustado ao padrão escolhido.

## Regras de testabilidade

Quando uma regra importante estiver presa a I/O do Windows, extrair somente a decisão pura para um helper testável e manter o adaptador de sistema operacional separado.

Não fazer mocks gigantes de `cmd.exe`, Electron ou Windows só para aumentar cobertura artificialmente.

## Critérios de aceite

- [ ] `npm test` existe e retorna código de saída correto.
- [ ] Testes não dependem de domínio corporativo, compartilhamento UNC real ou credenciais.
- [ ] Há casos positivos e negativos.
- [ ] Fallback WMIC possui cobertura determinística.
- [ ] Hostname possui cobertura.
- [ ] Configuração inválida possui pelo menos casos básicos.
- [ ] Suíte pode rodar localmente em poucos segundos.
- [ ] Nenhuma funcionalidade é alterada apenas para satisfazer testes.

## Não fazer

- não perseguir 100% de coverage;
- não testar estilos pixel a pixel;
- não iniciar Electron real em todos os testes;
- não criar infraestrutura E2E pesada nesta fase;
- não reescrever módulos grandes para aumentar testabilidade.

## Entrega esperada

Ao finalizar, informar:

- runner escolhido e motivo;
- arquivos cobertos;
- quantidade de testes;
- comandos executados;
- resultado;
- lacunas que continuam sem cobertura.

## Documentação

Adicionar ao README apenas a forma de rodar testes em desenvolvimento. Atualizar `.ai/CURRENT_STATE.md` com a existência da suíte.
