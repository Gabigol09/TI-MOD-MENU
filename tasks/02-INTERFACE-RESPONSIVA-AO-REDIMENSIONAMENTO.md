# TASK 02 — Interface responsiva ao redimensionamento da janela

**Prioridade:** P0 — UX / portfólio  
**Esforço esperado:** médio  
**Risco:** médio, concentrado na UI
**Status:** concluída e aprovada em revisão visual humana final

## Contexto

A janela Electron é redimensionável, porém a interface ainda utiliza diversas dimensões fixas: sidebar, header, terminal, paddings, fontes e modais. O resultado esperado é que o TI Director Mode se adapte de forma consistente à dimensão escolhida pelo usuário, sem cortar conteúdo ou deixar áreas inutilizáveis.

Esta é uma melhoria de alto valor para portfólio porque é imediatamente visível e melhora a qualidade percebida sem alterar o domínio do produto.

## Objetivo

Tornar toda a interface principal responsiva dentro de uma faixa mínima suportada de janela, preservando a identidade visual atual.

## Requisitos funcionais

1. Sidebar, painel principal, terminal e footer devem usar o espaço disponível sem sobreposição.
2. Redimensionar a janela deve reorganizar/dimensionar a UI em tempo real.
3. Não deve existir overflow horizontal na janela principal em dimensões suportadas.
4. Listas e formulários devem ganhar scroll interno quando necessário, em vez de empurrar elementos para fora da janela.
5. Modais devem respeitar `max-width`/`max-height` relativos à viewport e permitir scroll interno quando necessário.
6. A tela de Configurações e o módulo Deploy devem continuar utilizáveis em tamanhos menores.
7. O terminal deve permanecer visível, mas sua altura pode variar proporcionalmente à janela.
8. A janela minimizada/colapsada existente deve continuar funcionando.

## Implementação esperada

- Definir uma dimensão mínima nativa razoável no `BrowserWindow` para impedir layouts fisicamente impossíveis.
- Substituir dimensões rígidas críticas por `flex`, `minmax`, `%`, `clamp()`, `min()`, `max()` ou media queries conforme apropriado.
- Preservar a dimensão padrão atual como experiência de referência, sem exigir que o app fique maior.
- Evitar `transform: scale()` ou zoom global como solução principal; a interface deve realmente se adaptar ao espaço.
- Não realizar migração completa dos estilos inline para outro framework somente por causa desta task.

## Matriz mínima de validação

Validar pelo menos aproximadamente:

- 720 × 500 — tamanho padrão preservado;
- 600 × 420 — janela reduzida;
- 480 × 380 — menor viewport oficialmente suportada;
- 960 × 640 — janela ampliada.

## Critérios de aceite

- [x] Redimensionamento não corta sidebar, comandos, terminal ou footer.
- [x] Não há overflow horizontal não intencional.
- [x] Conteúdo vertical usa scroll onde necessário.
- [x] Todas as categorias permanecem acessíveis na viewport mínima.
- [x] Categoria e comando selecionados permanecem visíveis durante a navegação.
- [x] Configurações permanece utilizável.
- [x] Deploy permanece utilizável.
- [x] Modais cabem na viewport ou possuem scroll interno.
- [x] Minimizar/restaurar continua funcionando.
- [x] Aparência continua coerente com o design atual.

## Não fazer

- não redesenhar toda a identidade visual;
- não trocar React/CSS por outra biblioteca;
- não adicionar framework de UI pesado;
- não alterar fluxos de comandos, scripts ou deploy;
- não criar comportamento mobile; o alvo continua sendo desktop Windows.

## Validação mínima

- `npm run build:renderer`
- teste manual de resize nas dimensões definidas;
- teste visual de todas as categorias especiais, especialmente Configurações e Deploy.

## Resultado validado

A interface foi adaptada para redimensionamento real, preservando 720 × 500 como tamanho padrão e adotando 480 × 380 como mínimo suportado. Sidebar e terminal possuem dimensionamento responsivo; body e painéis são protegidos contra overflow horizontal; Configurações, Deploy e modais usam scroll interno adequado.

A navegação mantém visíveis tanto a categoria ativa quanto o comando selecionado, com acompanhamento automático restrito aos respectivos containers. Minimizar/restaurar e os fluxos operacionais de comandos, scripts, rede, IPC e Deploy foram preservados.

A validação visual humana final foi aprovada após as correções identificadas durante Review.

## Documentação

O estado implementado está registrado em `.ai/CURRENT_STATE.md`, e o contrato de viewport mínima está registrado em `.ai/DECISIONS.md`.
