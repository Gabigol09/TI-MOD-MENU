---  
# TI Director Mode — Tasks  

  

## Bugs  

  

### BUG-001 — Preparar máquina não conclui fluxo de Office  

Estado: Resolvido e validado pelo usuário.

Sintoma original:  
- Instalações funciona;  
- Preparar Máquina não conseguia concluir devido a bloqueios na tentativa de mapeamento de rede;  
- arquivo configurado não era aberto.  

Solução aplicada:  
- Desacoplamento da etapa de mapeamento de rede (`ensureSoftMapped`, `net use`, unidade `S:`) da execução do `Preparar máquina nova`.
- Detecção dinâmica de prefixo de notebook e abertura direta do Office correspondente.
- Validação realizada e confirmada com sucesso pelo usuário.  

### BUG-002 — Janela em branco no boot / Alt+Tab (ReferenceError TDZ)

Estado: Resolvido e validado via build.

Sintoma original:  
- Ao iniciar a aplicação (tanto em desenvolvimento quanto no build portable .exe), a janela não renderizava a interface e aparecia como um retângulo em branco/transparente no Alt+Tab.

Causa raiz:  
- No `App.jsx`, o hook `useEffect` do teclado incluía `handleRunOrStop` em seu array de dependências antes da declaração e inicialização da constante `handleRunOrStop = useCallback(...)`. Isso disparava um `Uncaught ReferenceError: Cannot access 'handleRunOrStop' before initialization` (Temporal Dead Zone) no momento da montagem inicial do React, impedindo a montagem da raiz `#root`.
- Além disso, em modo de desenvolvimento (`isDev`), a falta de fallback ao carregar a URL `http://localhost:5173` quando o Vite não estivesse rodando deixava a janela em branco.

Solução aplicada:  
- Reordenação rigorosa dos hooks e callbacks no `src/renderer/App.jsx` (`runScriptNow` -> `startScript` -> `startOpen` -> `runCmd` -> `stopRunning` -> `handleRunOrStop` -> `useEffect(keydown)`).
- Adicionado fallback em `src/main/main.js` para carregar `dist/renderer/index.html` caso o dev server não responda, além de captura de `did-fail-load` e `console-message`.
- Recompilado o bundle (`vite build`) e gerado novo pacote portable com sucesso.



  

## Melhorias  

### TASK-01 — Consistência de versão e identidade do produto (Implementado)
- **Status:** Concluído e validado.
- **Entregáveis:**
  - Handler IPC `get-app-version` em `main.js` que retorna `app.getVersion()`.
  - Método `window.ti.getAppVersion()` exposto via `preload.js`.
  - `App.jsx`: estado `appVersion` carregado no mount; header (normal e minimizado) exibe versão dinâmica; terminal inicial atualizado na mesma chamada.
  - `Header.jsx` (componente legado): prop `appVersion` adicionada; versão hardcoded `v1.5.1` removida.
  - `README.md`: URL e diretório de clone corrigidos para `TI-MOD-MENU` (nome real do repositório).
  - Build completo gerado e validado: `release/TI_DirectorMode_v1.8.0.exe`.

### TASK-02 — Interface responsiva ao redimensionamento (Implementado)
- **Status:** Concluído e aprovado em revisão visual humana final.
- **Entregáveis:**
  - `BrowserWindow` com dimensão mínima suportada de 480 × 380 e padrão preservado em 720 × 500.
  - Sidebar responsiva com largura entre 110 e 160 pixels.
  - Lista de categorias com padding e tipografia adaptáveis à altura disponível e scroll vertical restrito à própria lista.
  - Categoria ativa acompanhada por `scrollIntoView({ block: 'nearest' })` durante a navegação, sem rolar a aplicação inteira.
  - Comando selecionado acompanhado pelo mesmo mecanismo dentro da lista de comandos, permanecendo visível ao navegar para baixo, para cima ou ao trocar de categoria.
  - Terminal com altura proporcional entre 90 e 180 pixels.
  - Painel principal protegido contra overflow horizontal por `minWidth: 0` e `minHeight: 0`.
  - Modais inline e `WmicDialog` limitados à viewport, com scroll interno quando necessário.
  - Configurações e Deploy preservados com scroll vertical interno já existente.
  - Minimizar e restaurar preservados.
  - Fluxos operacionais de comandos, scripts, rede, IPC e Deploy não foram alterados.
  - `node --check src/main/main.js` e `npm run build:renderer` concluídos sem erros após as correções.
  - Validação visual humana final aprovada após correções no acesso às categorias e no acompanhamento automático da seleção das listas internas.

### Ajuste — Controle "sempre no topo" (Implementado)
- **Status:** Concluído e aprovado em validação humana.
- **Entregáveis:**
  - estado inicial consultado diretamente da janela Electron;
  - alteração feita por IPC com confirmação do estado nativo resultante;
  - desativação explícita de `alwaysOnTop`, sem reutilizar nível `floating` no estado falso;
  - botão com símbolos de estado, tooltip contextual e bloqueio durante a transição.
- **Validação:** verificações `node --check`, `npm test` (5/5) e `npm run build:renderer` concluídos sem erros.

### TASK-03 — Alerta de hostname fora do padrão configurado (Implementado)
- **Status:** Implementação concluída; aguardando revisão humana.
- **Entregáveis:**
  - leitura nativa de hostname compartilhada entre o boot e `Preparar Máquina`;
  - validação determinística com estados distintos para compatível, incompatível, indisponível, regra vazia e regex inválida;
  - aviso vermelho não bloqueante no terminal para hostname incompatível;
  - regex inválida apresentada como erro de configuração, sem falso mismatch;
  - classificação existente por `notebookPrefix` e abertura de Office preservadas;
  - cinco testes automatizados com o runner nativo do Node.
- **Validação:** `npm test`, verificações `node --check` dos módulos main alterados, `npm run build:renderer` e `npm run build` concluídos sem erros (BUILD = OK).

### TASK-04 — Suíte inicial de testes automatizados (Implementado)
- **Status:** Implementação concluída; aguardando revisão humana.
- **Runner:** Vitest 2, pela interoperabilidade com CommonJS e ESM sem migração da stack.
- **Entregáveis:**
  - scripts `npm test` e `npm run test:watch`;
  - 27 testes em 5 arquivos;
  - cobertura de fallback WMIC, categorias, hostname, classificação notebook, configuração e caminhos;
  - extrações puras mínimas, mantendo I/O e adaptadores Windows separados;
  - nenhuma dependência de rede, UNC real, credenciais, instalação ou Electron completo.
- **Validação:** suíte aprovada em aproximadamente 0,55 segundo; watch iniciado; sintaxe, renderer e build completo aprovados (BUILD = OK).
- **Limitações:** sem E2E, Electron real, processos Windows, rede/UNC ou cobertura visual.

### TASK-05 — CI mínimo com GitHub Actions (Implementado)
- **Status:** Implementação e primeira execução real no GitHub Actions concluídas com sucesso; aguardando revisão humana final.
- **Entregáveis:**
  - workflow `.github/workflows/ci.yml` para pushes e pull requests direcionados a `main`;
  - Node.js 20 com cache de npm baseado no lockfile;
  - gates obrigatórios `npm ci`, `npm test` e `npm run build:renderer`;
  - permissões somente de leitura e nenhum segredo ou recurso corporativo.
- **Full build:** `npm run build` aprovado localmente em Windows, mas mantido fora do CI mínimo por depender do empacotamento portable específico da plataforma.
- **Validação local:** 27 testes aprovados, renderer aprovado e full build aprovado.
- **Validação no GitHub Actions:** primeira execução real após push para `main` aprovada; checkout, Node.js 20, `npm ci`, `npm test` e `npm run build:renderer` concluíram com sucesso, mantendo o workflow verde. O aviso sobre a migração do runtime interno das actions oficiais para Node.js 24 foi não bloqueante.
- **Pendência:** revisão humana final e confirmação de estabilidade antes de adicionar o badge. A TASK-05 permanece em Done / Review, sem validação final.

### Módulo Deploy V1 — Catálogo e Execução em Lote (Implementado)
- **Status:** Implementação concluída.
- **Entregáveis:**
  - Aba Deploy na interface com agrupamento por categorias, seleção múltipla e badges de status em tempo real.
  - Sub-aba "Catálogo de Deploy" em Configurações para CRUD de categorias e softwares com teste de caminho.
  - Fila sequencial de execução com cancelamento limpo (`Ctrl+C` / Parar Deploy).
  - Persistência desacoplada em `config.json` e `configLoader.js`.

### Proteção de Configurações e Diagnóstico de Executáveis (Implementado)
- **Status:** Concluído.
- **Entregáveis:**
  - **Aviso de "Sair sem salvar":** ao modificar campos nas Configurações ou no Catálogo de Deploy e tentar alternar de aba (via clique ou `Tab`), o sistema exibe o modal `UnsavedModal` permitindo ao usuário "Permanecer" ou "Sair sem salvar", além de botão "Descartar" e badge visual `● Você possui alterações não salvas`.
  - **Diagnóstico inteligente no Deploy:** detecção de arquivos de dados/não executáveis (`.txt`, `.png`, `.pdf`, etc.) ou erro de comando não reconhecido no CMD, informando na tela e no log a orientação para usar o tipo "Abrir arquivo (Shell)".
  - **Alerta preventivo:** aviso em tempo real exibido no modal de cadastro de software caso o usuário selecione o tipo "Executável" mas informe um arquivo não executável.


  

## Testes pendentes  

  

- reproduzir o bug com caminho TXT;  

- capturar saída completa do `net use`;  

- verificar resultado da unidade configurada;  

- verificar acesso direto ao UNC;  

- confirmar identidade do processo;  

- confirmar código de retorno do processo;  

- confirmar caminho final utilizado pelo script.  

  

## Documentação  

  

- criar memória operacional persistente em `.ai/`;  

- registrar divergências entre documentação e implementação;  

- manter estado atual atualizado após mudanças.  

  

## Dívida técnica  

- suíte inicial existente, ainda sem cobertura E2E, Electron real, processos Windows, rede/UNC ou fluxos visuais;
- divergência entre estado local do ZIP e estado publicado no GitHub;  
- documentação de segurança de credenciais precisa ser validada contra a implementação atual.  


  

Não adicionar novas dívidas sem evidência.  