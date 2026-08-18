# TI Director Mode — Project

## O que é

TI Director Mode é um overlay de suporte técnico para ambientes Windows corporativos.

Ele centraliza comandos, diagnósticos, instalações e scripts de rollout em uma interface única sobre o desktop.

## Por que existe

O projeto foi criado para reduzir tarefas repetitivas executadas manualmente por analistas de suporte durante atendimento e preparação de máquinas.

Entre essas tarefas estão:

- diagnóstico;
- configuração de rede;
- mapeamento de recursos;
- instalação de software;
- inventário;
- preparação de máquinas;
- diagnóstico de drivers.

## Problema resolvido

O produto reduz a necessidade de:

- abrir CMD manualmente;
- memorizar comandos;
- localizar instaladores;
- repetir scripts;
- navegar por várias ferramentas do Windows.

## Público-alvo

Analistas e técnicos de suporte de TI em ambientes corporativos Windows.

## Ambiente

O projeto é direcionado a Windows 10/11 e considera ambientes com restrições de PowerShell, AppLocker e políticas corporativas.

## Principais capacidades

- catálogo de comandos;
- execução via CMD;
- execução de arquivos e caminhos pelo Shell do Windows;
- scripts de rollout;
- mapeamento de recursos de rede;
- autenticação de rede;
- instalação de software;
- diagnóstico;
- inventário;
- fallback para ausência do WMIC;
- configuração externa por `config.json`;
- logging;
- execução portable.

## Tecnologia

- Electron;
- React;
- Vite;
- Node.js `child_process`;
- Electron IPC;
- Windows CMD;
- ferramentas nativas do Windows.

## Objetivo técnico

Manter uma ferramenta de suporte pequena, configurável e adequada para ambientes corporativos Windows, reduzindo trabalho manual sem depender de PowerShell.

## Restrições importantes

- Windows é o ambiente-alvo.
- PowerShell não faz parte do runtime atual.
- Caminhos de software e rede são configuráveis.
- O projeto possui fluxos dependentes de UNC e `net use`.
- Execução de processos Windows é parte fundamental do produto.
- Compatibilidade com comportamentos existentes deve ser preservada.