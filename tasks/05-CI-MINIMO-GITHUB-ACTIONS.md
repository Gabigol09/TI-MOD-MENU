# TASK 05 — CI mínimo com GitHub Actions

**Prioridade:** P1 — DevEx / portfólio  
**Dependência:** TASK 04  
**Esforço esperado:** baixo  
**Risco:** baixo

## Contexto

O projeto já possui build local, mas o repositório não deve depender exclusivamente de validação manual. Para portfólio, um pipeline verde e simples demonstra disciplina de engenharia sem adicionar infraestrutura desnecessária.

## Objetivo

Criar um workflow mínimo no GitHub Actions que valide automaticamente alterações relevantes.

## Escopo

Criar `.github/workflows/ci.yml` ou nome equivalente com:

1. checkout;
2. Node na versão suportada pelo projeto;
3. cache de npm quando apropriado;
4. `npm ci`;
5. `npm test`;
6. `npm run build:renderer`;
7. opcionalmente full build do portable em job Windows separado somente se for estável e não exigir segredo.

## Estratégia

A primeira versão do CI deve privilegiar confiabilidade e velocidade. Se o full `electron-builder` introduzir instabilidade ou custo excessivo, manter `build:renderer` como gate obrigatório e documentar o full build como validação local até uma task futura.

Não publicar releases ou artefatos automaticamente nesta task.

## Critérios de aceite

- [ ] Workflow roda em `push` e/ou `pull_request` para `main` conforme política escolhida.
- [ ] Falha de teste deixa o workflow vermelho.
- [ ] Falha de build do renderer deixa o workflow vermelho.
- [ ] `npm ci` utiliza o lockfile existente.
- [ ] Pipeline não utiliza credenciais corporativas nem segredos de ambiente.
- [ ] Status do Actions fica visível no GitHub.
- [ ] Tempo e complexidade permanecem razoáveis para um projeto pequeno.

## Não fazer

- não adicionar deploy contínuo;
- não publicar executável automaticamente;
- não criar infraestrutura externa;
- não adicionar serviços pagos;
- não exigir recursos corporativos reais.

## Validação

Além de validar o YAML localmente quando possível, confirmar uma execução real do workflow no GitHub antes de declarar a task concluída.

## Documentação

Adicionar badge ao README somente depois que o workflow estiver confirmado e estável.
