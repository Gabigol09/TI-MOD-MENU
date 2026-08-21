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

- ausência de suíte automatizada;  
- divergência entre estado local do ZIP e estado publicado no GitHub;  
- documentação de segurança de credenciais precisa ser validada contra a implementação atual.  


  

Não adicionar novas dívidas sem evidência.  