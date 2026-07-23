# TI Director Mode — Empresa

Launcher de suporte de TI para Windows corporativo.

## Restrições corporativas

- **Não utiliza PowerShell** — apenas `cmd.exe`, ferramentas nativas (`net`, `ipconfig`, `wmic`, `dism`, `reg`, `netsh`, etc.) e APIs do Electron/Node no processo principal.
- Credenciais de rede são pedidas na interface e **não aparecem no log** do terminal.

## Como rodar (primeira vez)

```bash
cd ti-director
npm install
npm run dev
```

## Estrutura

```
ti-director/
  src/
    main/
      main.js           ← Electron main (CMD, scripts, WMIC/DISM)
      preload.js        ← Bridge segura renderer ↔ main
      scripts.js        ← SCRIPT_MAPEAR_SOFT, SCRIPT_NOVA_MAQ, SCRIPT_INVENTARIO
      corporatePaths.js ← UNC/caminhos Empresa (ajuste se necessário)
      adminCheck.js     ← Admin via `net session`
    renderer/
      App.jsx
    shared/
      commands.js       ← Catálogo de comandos
      resolveCommand.js ← Fallbacks quando WMIC ausente
```

## Atalhos

- `Ctrl+Shift+F1` — mostrar/ocultar
- `Tab / Shift+Tab` — categorias
- `↑ ↓` — comandos
- `Enter` — executar
- `_` — minimizar para faixa do header
- `P` — fixar/soltar always on top
- `✕` — fechar

## Scripts

| Script | O que faz |
|--------|-----------|
| Mapear Soft (S:) | `net use` com credenciais TI |
| Preparar máquina nova | Mapeia S:, detecta NB* vs desktop, abre Office correto e Rollout Assistant |
| Inventário do usuário | Abre Sobre + Device ID + programas e pede prints |

Se o **Rollout Assistant** não abrir, ajuste o caminho em `src/main/corporatePaths.js`.

## Gerar o .exe (portable)

```bash
npm install
npm run build
```

O ícone do app fica em `build/icon.png` (fonte) e é convertido automaticamente para `build/icon.ico` no build.

Saída: `release/TI_DirectorMode_v1.5.1.exe` — executável único, não precisa instalar Node na máquina de suporte.

Histórico de mudanças: [CHANGELOG.md](CHANGELOG.md).

Requisitos para **compilar** (só no seu PC de desenvolvimento): Node.js 18+ e Windows 10/11.

> O .exe é grande (~150–200 MB) porque inclui o runtime Electron. Na primeira execução o Windows pode exibir aviso do SmartScreen (app não assinado).
