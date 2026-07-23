# Changelog — TI Director Mode

Todas as mudanças relevantes do projeto.
Runtime **sem PowerShell** (apenas CMD, WMIC, DISM, reg, net, pnputil).

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

### Lançamento inicial — Embraer Edition

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
