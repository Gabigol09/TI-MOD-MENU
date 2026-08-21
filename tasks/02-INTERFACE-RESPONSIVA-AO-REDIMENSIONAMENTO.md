# TASK 02 — Interface responsiva ao redimensionamento da janela

**Prioridade:** P0 — UX / portfólio  
**Esforço esperado:** médio  
**Risco:** médio, concentrado na UI

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

- 720 × 500 — tamanho padrão atual;
- 600 × 420 — janela reduzida;
- 480 × 360 — próximo do mínimo suportado, se tecnicamente viável;
- 960 × 640 — janela ampliada.

Se 480 × 360 não for viável sem prejudicar usabilidade, definir e justificar um `minWidth`/`minHeight` ligeiramente maior.

## Critérios de aceite

- [ ] Redimensionamento não corta sidebar, comandos, terminal ou footer.
- [ ] Não há overflow horizontal não intencional.
- [ ] Conteúdo vertical usa scroll onde necessário.
- [ ] Configurações permanece utilizável.
- [ ] Deploy permanece utilizável.
- [ ] Modais cabem na viewport ou possuem scroll interno.
- [ ] Minimizar/restaurar continua funcionando.
- [ ] Aparência continua coerente com o design atual.

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

## Documentação

Registrar em `.ai/CURRENT_STATE.md` que a janela possui layout responsivo e qual é a dimensão mínima suportada.
