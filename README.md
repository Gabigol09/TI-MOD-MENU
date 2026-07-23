# TI Director Mode

Overlay de suporte técnico para Windows corporativo.
Desenvolvido para ambientes com restrições de PowerShell, AppLocker e políticas de
segurança corporativa.

> Origem: criado para uso interno em ambiente Embraer, evoluído para projeto genérico
> configurável por qualquer empresa de TI.

---

## Por que existe

Analistas de suporte perdem tempo significativo em tarefas repetitivas de rollout:
mapear rede, instalar software, coletar inventário, diagnosticar drivers.
O TI Director Mode centraliza tudo isso em um overlay flutuante que fica aberto
enquanto você atende — sem abrir CMD manualmente, sem decorar comandos.

---

## Restrições corporativas respeitadas

- **Zero PowerShell** — apenas `cmd.exe` e ferramentas nativas
  (`net`, `ipconfig`, `wmic`, `dism`, `reg`, `netsh`, `pnputil`).
- **Credenciais protegidas** — senha de rede pedida na interface, nunca aparece
  no log nem no terminal.
- **Sem instalação** — `.exe` portable, não requer Node.js na máquina de suporte.
- **Compatível com Windows 10/11** — fallbacks automáticos quando WMIC ausente.

---

## Como rodar (desenvolvimento)

```bash
git clone https://github.com/Gabigol09/TI-DIRECTOR-MOD
cd TI-DIRECTOR-MOD
npm install
npm run dev
```

Requisitos: Node.js 18+ e Windows 10/11.

---

## Configuração

Toda configuração fica em **`config.json`** na raiz do projeto.
Não requer recompilação — edite o arquivo e reinicie o programa.

```json
{
  "company": {
    "name": "Minha Empresa"
  },
  "network": {
    "softServer":  "\\\\servidor\\soft",
    "softDrive":   "S:",
    "gateway":     "192.168.1.1",
    "wifiProfile": "CORP_WIFI"
  },
  "paths": {
    "office365":        "\\\\servidor\\soft\\Office365\\setup.exe",
    "office2016":       "\\\\servidor\\soft\\Office2016\\setup.exe",
    "rolloutAssistant": "\\\\servidor\\soft\\RolloutAssistant\\RolloutAssistant.exe"
  },
  "hostname": {
    "pattern":       "^[A-Za-z]{2}\\d{5}S$",
    "notebookPrefix": "NB"
  },
  "log": {
    "path": "C:\\Suporte\\TIDirectorMode.log"
  }
}
```

Em produção, coloque o `config.json` na mesma pasta do `.exe`.
O programa busca o arquivo automaticamente e usa valores padrão
se alguma chave estiver ausente.

---

## Estrutura

```
ti-director/
  config.json               ← configuração editável por qualquer empresa
  src/
    main/
      main.js               ← Electron main (janela, IPC, atalho global)
      preload.js            ← Bridge segura renderer ↔ main
      configLoader.js       ← lê config.json com fallback para defaults
      corporatePaths.js     ← expõe caminhos do config.json para os scripts
      scripts.js            ← SCRIPT_MAPEAR_SOFT, SCRIPT_NOVA_MAQ, SCRIPT_INVENTARIO
      processRunner.js      ← execução de CMD com stream, stop, track
      adminCheck.js         ← verifica admin via net session
      wmicCheck.js          ← verifica se WMIC está funcional
    renderer/
      App.jsx               ← componente raiz
      components/
        Header.jsx          ← barra de título, PIN, minimizar, fechar
        Sidebar.jsx         ← lista de categorias
        CommandPanel.jsx    ← lista de comandos + tip
        Terminal.jsx        ← output em tempo real
        WmicDialog.jsx      ← modal de instalação do WMIC
    shared/
      commands.js           ← catálogo completo de comandos e categorias
      resolveCommand.js     ← aplica fallbacks WMIC automaticamente
  build/
    icon.png / icon.ico     ← ícone do app
```

---

## Atalhos

| Tecla | Ação |
|-------|------|
| `Ctrl+Shift+F1` | Mostrar / ocultar |
| `Tab` / `Shift+Tab` | Navegar categorias |
| `↑` `↓` | Navegar comandos |
| `Enter` | Executar |
| `_` | Minimizar para faixa do header |
| `P` | Fixar / soltar always on top |
| `✕` | Fechar |

---

## Scripts automáticos

| Script | O que faz |
|--------|-----------|
| **Mapear Soft (S:)** | `net use` com credenciais TI — senha não aparece no log |
| **Preparar máquina nova** | Mapeia S:, detecta NB vs Desktop pelo hostname, abre Office correto e Rollout Assistant |
| **Inventário do usuário** | Abre Sobre o PC + coleta Device ID + lista programas — solicita print para evidência de rollout |

---

## Gerar o .exe (portable)

```bash
npm install
npm run build
```

Saída: `release/TI_DirectorMode_v1.5.1.exe` (~150–200 MB, inclui runtime Electron).

> Na primeira execução o Windows pode exibir aviso do SmartScreen
> por ser um app não assinado por certificado comercial.

---

## Histórico de versões

Ver [CHANGELOG.md](CHANGELOG.md).
