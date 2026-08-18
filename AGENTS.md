# AGENTS.md — TI Director Mode  

  

## Regra principal  

  

Antes de modificar qualquer código, leia este arquivo e consulte os arquivos relevantes em `.ai/`.  

  

O estado documentado em `.ai/` representa a memória operacional do projeto.  

  

## Ordem de leitura  

  

Antes de iniciar uma tarefa:  

  

1. Leia `AGENTS.md`.  

2. Leia `.ai/PROJECT.md`.  

3. Leia `.ai/CURRENT_STATE.md`.  

4. Leia `.ai/ARCHITECTURE.md` quando a tarefa envolver arquitetura ou fluxo entre módulos.  

5. Leia `.ai/TASKS.md` para entender o trabalho conhecido.  

6. Leia `.ai/DECISIONS.md` antes de alterar mecanismos existentes.  

  

## Preservação  

  

- Não remover funcionalidades existentes sem autorização explícita.  

- Não alterar funcionalidades fora do escopo da tarefa.  

- Preservar comportamento existente quando não houver requisito contrário.  

- Não substituir uma implementação existente por uma arquitetura idealizada sem necessidade.  

- Não assumir que documentação está correta quando o código indicar o contrário.  

- Quando documentação e código divergirem, registrar a divergência.  

- Não inventar requisitos, comportamentos ou decisões.  

  

## Código crítico  

  

Tratar como áreas de risco elevado:  

  

- `src/main/scripts.js`  

- `src/main/processRunner.js`  

- `src/main/main.js`  

- `src/renderer/App.jsx`  

- `src/main/configLoader.js`  

- `src/main/corporatePaths.js`  

  

Alterações nesses módulos devem considerar os fluxos IPC e os processos Windows envolvidos.  

  

## Rede e UNC  

  

Antes de alterar fluxos de rede, verificar:  

  

- caminho UNC;  

- unidade configurada;  

- `net use`;  

- identidade do processo;  

- credenciais;  

- diferença entre acesso UNC e mapeamento de unidade;  

- execução como administrador;  

- comportamento do Shell do Windows;  

- códigos de retorno;  

- stdout/stderr.  

  

Não assumir que acesso UNC e unidade mapeada são equivalentes.  

  

## Execução  

  

O projeto foi construído para ambientes Windows corporativos e evita PowerShell.  

  

Não introduzir PowerShell sem autoriza