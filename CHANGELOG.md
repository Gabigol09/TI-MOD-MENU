# Changelog — TI Director Mode

Todas as mudanças relevantes do projeto. Runtime **sem PowerShell** (apenas CMD, WMIC, DISM, reg, net, pnputil).

---

## [1.5.1] — 2026-05-26

### Adicionado (ícone)

- Logo TI Director (`build/icon.png` → `build/icon.ico`) aplicado no `.exe`, barra de tarefas e atalho portable.
- Script `npm run build:icon` (gera ICO multi-tamanho antes do build).

### Corrigido

- **Drivers com problema:** substituído `wmic path Win32_PNPEntity ...` por `pnputil /enum-devices /problem` (evita *"Nenhuma instância disponível"* no Windows 11).
- Fallback WMIC para dispositivos PnP alinhado ao mesmo comando `pnputil`.

### Adicionado

- **CHANGELOG.md** com histórico de versões.
- Configuração **electron-builder** para gerar portable em `release/TI_DirectorMode_v1.5.1.exe` (x64, pasta `release/` no `.gitignore`).

### Documentação

- README: seção *Gerar o .exe* com requisitos e aviso SmartScreen.

---

## [1.5.0] — 2026-05-25

### Lançamento inicial — Empresa

- Launcher Electron + React (Vite) para suporte de TI em campo.
- Categorias: Rede, Impressoras, Oracle, Diagnóstico, Instalações, Scripts, Drivers, Desinstalar.
- Atalho global `Ctrl+Shift+F1`, janela always on top, minimizar em faixa, fixar (P).
- Navegação por teclado (Tab, setas, Enter) e terminal integrado com log em `C:\Suporte\TIDirectorMode.log`.
- Execução via **cmd.exe** com botão **PARAR** (`taskkill`, equivalente a Ctrl+C).
- Janela abre no **canto superior esquerdo** (0, 0).
- Scripts: mapear Soft (S:), preparar máquina nova, inventário do usuário.
- Detecção de **admin** (`net session`) e **WMIC funcional** (teste `wmic path`).
- Fallbacks automáticos para comandos WMIC quando indisponível (reg, systeminfo, devmgmt, etc.).
- Modal de credenciais para `net use` (senha não vai para o log).
- Instalação opcional de WMIC via DISM com barra de progresso.
- Confirmação para comandos irreversíveis (`dangerous`).
- Build portable Windows configurado (`npm run build`).
