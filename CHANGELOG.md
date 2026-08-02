# Changelog — TI Director Mode

Todas as mudanças relevantes do projeto.
Runtime **sem PowerShell** (apenas CMD, WMIC, DISM, reg, net, pnputil).

---

## [1.7.0] — 2026-08-02

### Adicionado

- **Tela de Configurações** — nova categoria `⚙ Configurações` na interface:
  edita empresa, rede, padrão de hostname e o caminho de cada instalador
  direto pelo app, com botão "Testar" por caminho (confere se o arquivo
  existe antes de salvar) e validação ao vivo do regex de hostname.
  Mudanças aplicam no próximo comando, sem reiniciar o app.

### Alterado

- `config.json` agora pode ser editado de duas formas: pela tela de
  Configurações (aplica na hora) ou manualmente no arquivo (exige reiniciar
  o app, como antes).
- Removida a etapa de abrir uma ferramenta de pós-instalação de terceiros em
  "Preparar máquina nova" — o fluxo agora termina após abrir o instalador do
  Office correto para o tipo de máquina detectado. Um checklist de
  pós-instalação configurável está planejado para uma próxima versão.

### Técnico

- `corporatePaths.js` deixou de calcular os caminhos uma única vez na
  inicialização — agora expõe uma função que lê o `config.json` atual a
  cada chamada, o que tornou possível a tela de Configurações ter efeito
  imediato.
- Novos canais IPC: `get-config`, `save-config`, `test-path`.

---

## [1.6.1] — 2026-07-29

### Alterado

- Catálogo de comandos e `config.json` generalizados para uso por qualquer
  empresa: caminhos de servidor, unidades de rede e instaladores agora usam
  placeholders genéricos (`\\servidor\soft`) totalmente configuráveis, sem
  necessidade de recompilar.
- Categoria **Instalações** revisada para conter apenas software comum a
  qualquer ambiente corporativo (Office, navegadores, PDF, utilitários) —
  itens de nicho (ferramentas de CAD específicas, agentes de licenciamento
  proprietários) removidos do catálogo padrão.
- "Remover perfil WiFi" generalizado: em vez de um nome de perfil fixo, agora
  remove todos os perfis salvos — resolve o mesmo problema de certificado de
  forma mais abrangente e sem depender de nomenclatura de rede específica.

### Corrigido

- **Trava ao cancelar modal de credenciais:** o estado `running` era marcado
  como `true` antes de o app saber se o modal de credenciais ia aparecer.
  Cancelar o modal não desfazia isso, travando o botão em "PARAR"
  permanentemente e impedindo a execução de qualquer outro comando. Corrigido
  adiando o `running=true` para o momento em que o processo é realmente
  iniciado, e resetando o estado ao cancelar.
- **Janela minimizada bloqueava clique atrás dela:** o botão "Minimizar"
  alterava apenas o conteúdo React (colapsava a UI para a faixa de título),
  mas a janela nativa do Electron continuava no tamanho cheio (720x500),
  transparente e sempre no topo — capturando cliques na área "vazia".
  Corrigido: minimizar/restaurar agora redimensiona a janela real via novo
  canal IPC `window-set-collapsed`.

### Documentação

- `config.json` comentado (campos `_comment` em cada seção) explicando o que
  cada uma controla, incluindo o padrão de hostname usado por "Preparar
  máquina nova".
- Adicionado `LICENSE` (MIT) — antes ausente.

---

## [1.6.0] — 2026-07-23

### Adicionado

- **`config.json`** na raiz do projeto — arquivo de configuração editável sem recompilação.
  Qualquer empresa pode adaptar servidores, caminhos de rede, prefixos de hostname e
  caminho de log sem tocar em código JavaScript.

- **`src/main/configLoader.js`** — módulo que lê `config.json` em runtime com:
  - Busca automática do arquivo em múltiplos caminhos (dev, produção, ao lado do `.exe`)
  - Merge profundo (`deepMerge`) com valores default — programa não quebra se uma chave
    estiver ausente no JSON
  - Log no console indicando qual arquivo foi carregado

- **`src/main/corporatePaths.js`** refatorado — agora lê os caminhos do `config.json`
  via `configLoader` em vez de ter valores hardcoded. Interface de exportação mantida
  idêntica: `scripts.js` e `main.js` não precisaram de nenhuma alteração.

### Técnico

- Separação de **configuração vs código** (princípio 12-factor app / config externalization).
- Portabilidade: projeto agora funciona em qualquer ambiente sem modificar código-fonte.

### Documentação

- README atualizado com seção *Configuração* explicando o `config.json`.
- Estrutura de pastas atualizada para incluir `configLoader.js`.

---

## [1.5.1] — 2026-05-26

### Adicionado

- Logo TI Director (`build/icon.png` → `build/icon.ico`) aplicado no `.exe`,
  barra de tarefas e atalho portable.
- Script `npm run build:icon` (gera ICO multi-tamanho antes do build).

### Corrigido

- **Drivers com problema:** substituído `wmic path Win32_PNPEntity ...` por
  `pnputil /enum-devices /problem` — evita *"Nenhuma instância disponível"*
  no Windows 11.
- Fallback WMIC para dispositivos PnP alinhado ao mesmo comando `pnputil`.

### Adicionado

- **CHANGELOG.md** com histórico de versões.
- Configuração **electron-builder** para gerar portable em
  `release/TI_DirectorMode_v1.5.1.exe` (x64).

### Documentação

- README: seção *Gerar o .exe* com requisitos e aviso SmartScreen.

---

## [1.5.0] — 2026-05-25

### Lançamento inicial

- Launcher Electron + React (Vite) para suporte de TI em campo.
- Categorias: Rede, Impressoras, Oracle, Diagnóstico, Instalações, Scripts, Drivers,
  Desinstalar.
- Atalho global `Ctrl+Shift+F1`, janela always on top, minimizar em faixa, fixar (P).
- Navegação por teclado (Tab, setas, Enter) e terminal integrado com log em
  `C:\Suporte\TIDirectorMode.log`.
- Execução via **cmd.exe** com botão **PARAR** (`taskkill`).
- Janela abre no canto superior esquerdo (0, 0).
- Scripts: mapear Soft (S:), preparar máquina nova, inventário do usuário.
- Detecção de **admin** (`net session`) e **WMIC funcional** (`wmic path`).
- Fallbacks automáticos para comandos WMIC (reg, systeminfo, devmgmt, etc.).
- Modal de credenciais para `net use` — senha não aparece no log.
- Instalação opcional de WMIC via DISM com barra de progresso real.
- Confirmação para comandos irreversíveis (`dangerous: true`).
- Build portable Windows configurado (`npm run build`).
