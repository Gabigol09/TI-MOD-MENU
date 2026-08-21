# TASK — Implementar Deploy V1 no TI Director Mode

## Objetivo

Implementar a V1 do novo módulo Deploy no TI Director Mode.

O Deploy deve permitir que o usuário monte um catálogo configurável de softwares e depois selecione múltiplos itens para execução.

A implementação deve integrar o novo módulo à arquitetura existente do projeto, reutilizando mecanismos já existentes sempre que possível.

Não criar uma arquitetura paralela desnecessária.

---

# 1. ESTRUTURA FUNCIONAL

Adicionar uma nova aba:

Deploy

A estrutura geral deverá ficar conceitualmente:

TI DIRECTOR MODE
├── Instalações
├── Scripts
├── Diagnóstico
├── Deploy
└── Configurações

O Deploy deve ser uma funcionalidade independente das abas existentes, mas deve reutilizar componentes, funções e mecanismos existentes quando fizer sentido.

---

# 2. CONFIGURAÇÃO DO DEPLOY

Adicionar uma área específica:

Configurações → Deploy

Essa área deve ser separada visualmente e funcionalmente das demais configurações para evitar confusão.

O usuário deverá conseguir:

- criar categorias;
- editar categorias;
- remover categorias;
- adicionar softwares;
- editar softwares;
- remover softwares;
- definir a ordem dos itens/categorias quando isso fizer sentido.

Não criar categorias fixas no código.

Categorias iniciais podem existir como dados/configuração padrão, mas o sistema deve permitir categorias personalizadas.

Exemplos:

- Softwares Básicos
- Opcionais
- Desenvolvimento
- Engenharia
- Personalizados

Esses nomes são apenas exemplos.

---

# 3. CADASTRO DE SOFTWARE

Cada software deverá possuir, no mínimo:

- nome;
- categoria; ☐ Basico ☐ Opcional
- tipo; ☐ executavel ☐ script
- caminho;
- argumentos; (opcional)
- descrição. (opcional)

Exemplo:

Nome:
Microsoft 365

Categoria:
Softwares Básicos

Tipo:
Executável

Caminho:
C:\Deploy\Office\setup.exe

Argumentos:
/configure config.xml

Descrição:
Pacote padrão

Não fixar Microsoft 365, Citrix, Chrome, MATLAB, AutoCAD etc. no código.

Esses devem ser apenas exemplos de itens que o usuário poderia cadastrar.

---

# 4. TIPOS DE EXECUÇÃO — V1

Implementar somente os tipos necessários para uma V1 simples e segura.

Priorizar:

- Executável
- Script
- Abrir arquivo

Não transformar o Deploy em um executor universal arbitrário de comandos.

Se a arquitetura atual já possuir mecanismos equivalentes para execução de processos/scripts, reutilizá-los.

Antes de criar um novo executor, procurar os mecanismos existentes no projeto.

---

# 5. ABA DEPLOY

A aba Deploy deverá apresentar:

- categorias;
- softwares pertencentes às categorias;
- checkbox para seleção;
- botão "Executar Deploy".

Conceitualmente:

DEPLOY

☐  SOFTWARES BÁSICOS
	☐ Microsoft 365
	☐ Citrix
	☐ Chrome

OPCIONAIS
	☐ MATLAB
	☐ AutoCAD

[ EXECUTAR DEPLOY ]

As categorias e softwares exibidos devem vir da configuração do usuário.

---

# 6. EXECUÇÃO

Ao executar o Deploy:

1. obter os itens selecionados;
2. executar os itens de forma sequencial;
3. aguardar o resultado de cada item antes de avançar, quando o mecanismo de execução permitir;
4. apresentar o estado individual de cada item.

Estados mínimos:

- Aguardando
- Executando
- Concluído
- Erro

Exemplo:

✓ Microsoft 365 — Concluído
✓ Citrix — Concluído
■ MATLAB — Executando...
■ AutoCAD — Aguardando

O usuário deve conseguir identificar claramente qual item falhou.

---

# 7. LOGS E ERROS

Reutilizar o sistema de logging existente.

Não criar um segundo sistema de logs sem necessidade.

Cada execução deve registrar informações suficientes para diagnosticar:

- item executado;
- tipo;
- caminho;
- resultado;
- código de saída quando disponível;
- erro quando disponível.

Erros de um item não devem ser mascarados.

Definir comportamento consistente para a fila quando um item falhar.

Preferencialmente, a falha de um item deve ser registrada e o usuário deve saber que aquele item falhou.

Não implementar mecanismos complexos de retry na V1.

---

# 8. INTEGRAÇÃO COM A ARQUITETURA EXISTENTE

Antes de implementar, investigar:

- sistema atual de configurações;
- armazenamento do config.json;
- processRunner;
- mecanismos atuais de execução;
- IPC;
- componentes React existentes;
- sistema de logs;
- tratamento de privilégios;
- funções utilizadas pelas abas Instalações e Scripts;
- mecanismos de abertura de arquivos;
- funções que já resolvem caminhos corporativos.

Reutilizar esses mecanismos quando forem compatíveis.

Não duplicar lógica existente.

---

# 9. RELAÇÃO COM FUNCIONALIDADES EXISTENTES

Investigar se alguma funcionalidade existente possui responsabilidade que agora seria melhor atendida pelo Deploy.

Exemplos:

- comandos de instalação;
- execução de instaladores;
- abertura de arquivos;
- scripts de preparação;
- lógica duplicada de execução de processos.

IMPORTANTE:

Não remover nenhuma funcionalidade existente automaticamente.

Se alguma função parecer obsoleta ou redundante depois da implementação do Deploy:

1. documentar qual função é;
2. explicar por que ela ficou potencialmente obsoleta;
3. mostrar qual funcionalidade do Deploy a substitui;
4. verificar quem ainda utiliza essa função;
5. NÃO removê-la nesta task sem autorização explícita.

---

# 10. PREPARAR MÁQUINA

Não substituir ou reescrever o fluxo atual de:

Scripts → Preparar Máquina

nesta V1.

O Deploy deve ser implementado de forma independente.

Porém, durante a implementação, identificar pontos onde o Deploy poderia futuramente substituir ou integrar funcionalidades existentes.

Registrar essas oportunidades como observações técnicas, não como alterações obrigatórias.

---

# 11. MODELO DE DADOS

Criar uma estrutura de configuração simples e persistente.

Conceitualmente:

categories
  └── category
       └── software[]

Cada software deve possuir os campos definidos anteriormente.

Não criar banco de dados para a V1 se o sistema atual já possui mecanismo adequado de configuração persistente.

Preferir o mecanismo de configuração existente.

---

# 12. SEGURANÇA E ESCOPO

Não permitir que a implementação transforme o Deploy em execução irrestrita de comandos arbitrários.

Não adicionar:

- shell universal;
- terminal embutido;
- comandos arbitrários;
- sistema de download automático;
- instalação remota;
- gerenciamento remoto de máquinas.

Esses recursos não fazem parte da V1.

---

# 13. COMPATIBILIDADE

Não quebrar:

- Instalações;
- Scripts;
- Diagnóstico;
- Configurações existentes;
- Preparar Máquina;
- sistema de logs;
- configuração atual.

Preservar configurações existentes.

Se for necessário alterar o formato do arquivo de configuração, implementar compatibilidade/migração sem perder configurações existentes.

---

# 14. UI

A interface deve seguir o padrão visual já existente no TI Director Mode.

Não criar uma interface visual completamente diferente.

Configurações → Deploy deve ficar claramente separado das demais configurações.

Deploy deve priorizar:

- leitura rápida;
- seleção fácil;
- status visível;
- feedback de erro.

---

# 15. IMPLEMENTAÇÃO EM ETAPAS

Antes de modificar código:

1. ler AGENTS.md;
2. ler .ai/PROJECT.md;
3. ler .ai/ARCHITECTURE.md;
4. ler .ai/CURRENT_STATE.md;
5. analisar a arquitetura atual;
6. identificar os pontos de integração;
7. identificar funções reutilizáveis;
8. identificar possíveis funções que poderão ficar obsoletas.

Depois apresentar um plano curto.

NÃO implementar antes de apresentar o plano.

---

# 16. CRITÉRIOS DE ACEITE

AC-01
Existe uma aba Deploy funcional.

AC-02
Existe Configurações → Deploy separado das demais configurações.

AC-03
Usuário consegue criar categorias.

AC-04
Usuário consegue adicionar, editar e remover softwares.

AC-05
Categorias não ficam limitadas ao código.

AC-06
Softwares possuem nome, categoria, tipo, caminho, argumentos e descrição.

AC-07
Deploy apresenta os softwares agrupados por categoria.

AC-08
Usuário consegue selecionar múltiplos softwares.

AC-09
Execução ocorre sequencialmente.

AC-10
Cada item apresenta seu estado.

AC-11
Erros são registrados utilizando o sistema de logs existente.

AC-12
Configurações existentes continuam funcionando.

AC-13
Instalações e Scripts não sofrem regressão.

AC-14
Preparar Máquina permanece funcionando conforme estado atual.

AC-15
Não existe dependência de softwares específicos fixados no código.

AC-16
Não existe executor universal de comandos arbitrários.

AC-17
Não remover funções existentes sem autorização.

---

# 17. OBRIGAÇÃO DO AGENTE

Ao finalizar a implementação, apresentar:

1. arquivos criados;
2. arquivos modificados;
3. arquitetura utilizada;
4. mecanismos existentes que foram reutilizados;
5. funções potencialmente obsoletas;
6. funcionalidades que NÃO foram removidas;
7. testes executados;
8. resultado dos testes;
9. eventuais limitações;
10. sugestões para V2.

Não declarar a task concluída sem evidência.

Não fazer commit nem push sem autorização.