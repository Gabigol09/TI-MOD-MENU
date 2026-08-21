# TI Director Mode — Ordem de execução das melhorias

## Objetivo deste pacote

Este conjunto transforma o feedback técnico consolidado em tarefas de implementação adequadas ao estado atual do TI Director Mode, priorizando:

- alto impacto com baixo/médio esforço;
- valor técnico e visual para portfólio;
- redução de risco antes de refatorações maiores;
- preservação do comportamento já existente;
- baixo desperdício de tokens/agentes.

## Ordem recomendada

1. `01-CONSISTENCIA-DE-VERSAO-E-IDENTIDADE.md` — corrigir divergências atuais de versão/documentação e criar uma fonte confiável para a versão exibida.
2. `02-INTERFACE-RESPONSIVA-AO-REDIMENSIONAMENTO.md` — tornar a interface realmente adaptável ao tamanho da janela.
3. `03-ALERTA-HOSTNAME-FORA-DO-PADRAO.md` — aviso operacional no terminal quando o hostname não respeitar o padrão configurado pelo usuário.
4. `04-SUITE-INICIAL-DE-TESTES.md` — criar a primeira camada de testes automatizados, focada em regras determinísticas.
5. `05-CI-MINIMO-GITHUB-ACTIONS.md` — executar testes e build automaticamente no GitHub.
6. `06-VALIDACAO-DE-CONFIGURACAO.md` — validar configuração cedo e apresentar erros úteis sem depender de recursos corporativos reais.
7. `07-ENDURECIMENTO-IPC-INCREMENTAL.md` — reduzir a exposição de execução de strings livres sem refatoração big-bang.

## Regras gerais para todas as tasks

Antes de alterar código, o agente deve:

1. Ler `AGENTS.md`.
2. Ler `.ai/PROJECT.md`, `.ai/CURRENT_STATE.md` e `.ai/ARCHITECTURE.md`.
3. Verificar `git status` e preservar alterações existentes do usuário.
4. Confirmar o estado real do código antes de assumir que README/CHANGELOG estão sincronizados.
5. Não remover funcionalidades fora do escopo.
6. Não fazer commit ou push sem autorização explícita.
7. Ao finalizar, informar arquivos alterados, testes executados, resultados e limitações.

## Itens deliberadamente adiados

Os itens de maior custo ou menor retorno imediato estão consolidados em `90-FUTURO-BACKLOG-DIFERIDO.md`.
