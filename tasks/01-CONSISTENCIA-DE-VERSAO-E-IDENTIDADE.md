# TASK 01 — Consistência de versão e identidade do produto

**Prioridade:** P0 — quick win / confiabilidade / portfólio  
**Esforço esperado:** baixo  
**Risco:** baixo

## Contexto

O estado público atual apresenta divergências entre fontes de versão e documentação. O `package.json` declara a versão `1.8.0`, enquanto trechos do renderer ainda exibem `v1.7.0`. O README já descreve recursos da linha 1.8, mas o CHANGELOG publicado ainda não possui uma entrada `1.8.0`.

Para um projeto de portfólio, esse tipo de divergência passa sensação de release incompleto e também confunde agentes futuros.

## Objetivo

Fazer com que nome e versão exibidos pela aplicação sejam derivados de uma fonte confiável e manter `package.json`, UI, README e CHANGELOG coerentes com o estado real do produto.

## Escopo

1. Identificar todos os pontos em que `TI Director Mode`, versão do app ou nome do artefato estão hardcoded.
2. Usar a versão do aplicativo/package como fonte para a versão exibida na UI, evitando repetir `v1.x.x` manualmente em múltiplos componentes.
3. Corrigir textos do renderer que ainda indiquem versão antiga.
4. Revisar o README para garantir que comandos de clone, nome do repositório, nome do binário e versão documentada correspondam ao repositório real.
5. Criar/ajustar a entrada `1.8.0` no CHANGELOG somente com alterações que possam ser confirmadas no histórico/código atual. Não inventar itens.
6. Preservar o nome oficial `TI Director Mode` e o comportamento do build portable.

## Estratégia preferida

Se a versão precisar chegar ao renderer, preferir uma pequena API de informação do aplicativo através do preload/IPC ou outra fonte já disponível no runtime Electron, em vez de importar e duplicar manualmente o número da versão.

Não criar um sistema de release novo nesta task.

## Não fazer

- não mudar stack;
- não alterar funcionalidades;
- não renomear o repositório;
- não criar release automático;
- não assinar binário;
- não alterar versionamento para SemVer diferente do já utilizado;
- não incrementar versão apenas para executar esta task, salvo autorização explícita.

## Critérios de aceite

- [ ] Não existe versão antiga hardcoded visível ao usuário quando o package declara uma versão mais nova.
- [ ] A versão exibida pelo app corresponde à versão oficial do build.
- [ ] README aponta para o repositório/nome corretos.
- [ ] CHANGELOG representa o histórico real sem inventar funcionalidades.
- [ ] Build continua funcionando.
- [ ] Nenhuma funcionalidade operacional foi alterada.

## Validação mínima

- `npm run build:renderer`
- validação do carregamento do app em desenvolvimento, se possível;
- busca no repositório por versões hardcoded antigas;
- conferir `package.json`, UI, README e CHANGELOG lado a lado.

## Documentação

Atualizar `.ai/CURRENT_STATE.md` se a inconsistência de versão estiver registrada lá.
