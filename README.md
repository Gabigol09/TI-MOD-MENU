# TI Director Mode — Embraer Edition

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
      corporatePaths.js ← UNC/caminhos Embraer (ajuste se necessário)
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

## Build portable

```bash
npm run build
```

Gera `TI_DirectorMode_v1.5.exe` (sem PowerShell em runtime).
