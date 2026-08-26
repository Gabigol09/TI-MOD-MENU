# TI Director Mode

> Overlay de suporte técnico para Windows corporativo — desenvolvido para ambientes com
> restrições de PowerShell, AppLocker e políticas de segurança corporativa.

<!-- GIF ou screenshot principal aqui -->
![TI Director Mode em uso](docs/demo.gif)

---

## Resultados

- Redução do tempo de preparação de máquina de ~15 para ~3 minutos
- Instalação e rollout em lote de múltiplos softwares via novo módulo **Deploy**
- Mais de 50 comandos de suporte centralizados em um único overlay
- Eliminação de execução manual de scripts recorrentes durante rollout
- Fallback automático para ambientes sem WMIC (Windows 11 22H2+)
- Interface redimensionável, com layout adaptável entre o tamanho padrão de 720×500 e a viewport mínima suportada de 480×380
- Credenciais de rede protegidas — senha nunca aparece em log ou terminal

---

## Por que existe

Analistas de suporte perdem tempo significativo em rollouts: mapear rede,
instalar software, coletar inventário, diagnosticar drivers. O TI Director Mode
centraliza tudo em um overlay flutuante que fica sobre qualquer janela enquanto
você atende — sem abrir CMD manualmente, sem decorar comandos, sem errar caminho
de instalador.

Origem: criado para uso interno em ambiente corporativo, evoluído para projeto
configurável por qualquer empresa de TI via `config.json`.

---

## Screenshots

![Aba Rede com Terminal em uso](docs/redes2.png)
![Aba instalações](docs/instaladores.png)
![Modal Credenciais](docs/modalcredenciais.png)
![Warning](docs/Warn.png)
---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Shell da aplicação | Electron 28 |
| Interface | React 18 + Vite 5 |
| Estilização | CSS Modules + glassmorphism nativo |
| Execução de comandos | Node.js `child_process` (spawn/exec) |
| Motor de comandos | Windows CMD (`cmd.exe`) |
| Inventário de hardware | WMIC / fallback `reg query` + `systeminfo` |
| Drivers | `pnputil /enum-devices /problem` |
| Instalação de features | DISM (`/add-capability`) |
| Mapeamento de rede | `net use` |
| Comunicação renderer ↔ main | Electron IPC com `contextBridge` |
| Build | `electron-builder` (portable `.exe`) |

---

## Segurança

- **Zero PowerShell** — apenas `cmd.exe` e ferramentas nativas Windows
  (`net`, `ipconfig`, `wmic`, `reg`, `netsh`, `pnputil`, `dism`)
- **Credenciais protegidas** — senha de rede passada via variável de ambiente
  do processo filho, nunca gravada em arquivo no disco (nem temporário);
  nunca aparece no log ou no terminal
- **IPC com contextIsolation** — renderer não acessa Node.js diretamente;
  toda comunicação passa pelo `preload.js` com `contextBridge`
- **Confirmação para ações destrutivas** — comandos marcados com `dangerous: true`
  exibem modal de confirmação antes de executar
- **Log auditável** — todas as execuções registradas em `C:\Suporte\TIDirectorMode.log`
  com timestamp, sem dados sensíveis

---

## Configuração

Duas formas de configurar, sem nunca precisar recompilar:

**1. Pela própria interface (recomendado)** — categoria **⚙ Configurações** no
app: edita os caminhos, testa se cada um existe, e salva. Vale no próximo
comando, sem reiniciar o app.

**2. Editando `config.json` direto** — arquivo base na raiz do projeto. Ele continua servindo como fallback compatível; alterações feitas pela interface são persistidas separadamente como configuração compartilhada.

Em produção, a cópia do aplicativo usa `ti-director-settings.json` ao lado do `.exe`. Em desenvolvimento, esse arquivo fica na raiz do projeto. Assim, catálogo, paths e opções globais podem ser reutilizados por quem executa a mesma cópia. O estado de hostname e reinicialização continua local em cada máquina e nunca é salvo nesse arquivo.

```json
{
  "company": { "name": "Minha Empresa" },
  "network": {
    "softServer":  "\\\\servidor\\soft",
    "softDrive":   "S:",
    "gateway":     "192.168.1.1",
    "wifiProfile": "CORP_WIFI"
  },
  "paths": {
    "office365": "\\\\servidor\\soft\\Office365\\setup.exe",
    "chrome":    "\\\\servidor\\soft\\Chrome\\ChromeSetup.exe"
  },
  "hostname": {
    "pattern":        "^[A-Za-z]{2}\\d{5}S$",
    "notebookPrefix": "NB"
  }
}
```

Lista completa de caminhos configuráveis: veja `config.json` na raiz do
projeto, ou a própria tela de Configurações no app.

A configuração valida tipos, unidade (`S:` ou `S`), regex de hostname e estrutura do catálogo Deploy antes de salvar. Caminhos UNC ou locais usam representação canônica sem aspas externas; disponibilidade de rede, credenciais e existência de arquivos continuam sendo verificações operacionais do botão **Testar** ou da execução.

No catálogo de Deploy, itens marcados como baseline de preparação são pré-selecionados somente ao chegar pelo fluxo **Preparar máquina**. A fila nunca inicia automaticamente, e abrir o Deploy diretamente não força essa seleção.

A tela de Configurações indica se o arquivo compartilhado está ativo, ausente, somente leitura, inválido ou em conflito e oferece ação explícita para recarregar.

---

## Como rodar (desenvolvimento)

```bash
git clone https://github.com/Gabigol09/TI-MOD-MENU.git
cd TI-MOD-MENU
npm install
npm run dev
```

Requisitos: Node.js 20+ e Windows 10/11.

### Testes

```bash
npm test
npm run test:watch
```

A suíte unitária cobre regras determinísticas e não depende de rede corporativa, credenciais, compartilhamentos reais ou Electron completo.

### Integração contínua

O workflow `.github/workflows/ci.yml` valida pushes e pull requests para `main` com Node.js 20, `npm ci`, `npm test` e `npm run build:renderer`. O build completo do portable permanece uma validação local em Windows por depender do `electron-builder` e de etapas específicas da plataforma.

---

## Estrutura

```
ti-director/
  config.json               ← configuração editável (servidores, caminhos, deploy, hostname)
  src/
    main/
      main.js               ← janela Electron, IPC, atalho global
      preload.js            ← bridge segura renderer ↔ main
      configLoader.js       ← lê, normaliza e salva com store compartilhado
      configValidator.js    ← valida configuração e catálogo de Deploy
      configuredPath.js     ← normaliza caminhos configurados sem quoting de comando
      sharedConfigStore.js  ← escrita atômica, conflitos e seções compartilháveis
      corporatePaths.js     ← expõe caminhos do config para os scripts
      commandRegistry.js    ← resolve comandos endurecidos por intenção
      scripts.js            ← automações de rede e inventário
      processRunner.js      ← contratos CMD/Deploy, streaming, tracking e cancelamento
      machinePreparation.js ← preflight, rename e reboot controlado
      machinePreparationState.js ← estado mínimo e persistente de reboot pendente
      adminCheck.js         ← verifica privilégio via net session
      wmicCheck.js          ← detecta disponibilidade do WMIC
    renderer/
      App.jsx
      components/           ← inclui DeployPanel, DeploySettings, MachinePreparationModal e Configurações
      styles/               ← CSS Modules por componente
    shared/
      commands.js           ← catálogo de 50+ comandos e categorias
      resolveCommand.js     ← aplica fallbacks WMIC automaticamente
      machinePreparationWorkflow.js ← decisões puras de baseline e resultado do Deploy
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
| `◆` / `◇` | Ativar / desativar a janela sempre no topo |
| `✕` | Fechar |

A categoria **⚙ Configurações** (sidebar) foge desse padrão de propósito —
em vez de comandos, é um formulário pra editar os caminhos e o catálogo de Deploy direto pela
interface (veja a seção Configuração abaixo). Ao navegar por teclado, a interface acompanha
a seleção para manter visíveis a categoria e o comando ativos, inclusive em janelas menores.

---

## Scripts automáticos

| Script | O que faz |
|--------|-----------|
| **Mapear Soft (S:)** | `net use` com credenciais TI — senha não aparece no log |
| **Preparar máquina nova** | Valida/corrige o hostname, oferece reinício imediato ou adiado e direciona ao Deploy com baseline configurável para revisão |
| **Inventário do usuário** | Coleta Sobre o PC + Device ID + Programas instalados e solicita print para evidência de rollout |

Após uma alteração de hostname, o aviso global permanece até o Windows iniciar com o nome esperado. Concluir, cancelar ou adiar o Deploy não remove essa pendência.

## Tipos de execução do Deploy

| Tipo | Contrato |
|------|----------|
| **Executável (.exe / .msi)** | Execução rastreada; o resultado considera o código de saída do processo. |
| **Script (.bat / .cmd)** | Execução rastreada até o término real, com argumentos, saída no terminal interno e suporte ao botão Parar. |
| **Script com console visível** | Mantém tracking enquanto abre um CMD interativo para scripts com `pause`, `choice` ou entrada pelo teclado; só conclui quando o processo termina. |
| **Abrir pelo Shell** | Delega a abertura ao Windows em modo fire-and-forget; indica apenas que o item foi aberto, não que uma instalação terminou. |

O resumo da fila diferencia sucesso, sucesso parcial, falha e cancelamento. A ação **Revisar Configurações** aparece somente quando a falha é compatível com caminho ou configuração do catálogo.

---


## Gerar o .exe portable

```bash
npm install
npm run build
```

Saída: `release/TI_DirectorMode_v1.8.3.exe` (~150–200 MB, runtime Electron incluso).

> Na primeira execução o Windows pode exibir aviso do SmartScreen por ser um app
> não assinado por certificado comercial.

---

## Histórico de versões

Ver [CHANGELOG.md](CHANGELOG.md).
