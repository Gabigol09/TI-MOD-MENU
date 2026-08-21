# TASK 03 — Alerta de hostname fora do padrão configurado

**Prioridade:** P0 — operação / confiabilidade  
**Esforço esperado:** baixo  
**Risco:** baixo

## Contexto

O projeto já permite que o usuário configure uma regra de hostname em `config.json`/Configurações. A aplicação deve aproveitar essa regra também como verificação operacional: se o nome atual da máquina não respeitar o padrão configurado pelo usuário, o técnico deve ser avisado claramente.

A intenção é alertar, não bloquear o uso do software.

## Objetivo

Detectar o hostname atual da máquina e, quando ele não corresponder ao padrão configurado, emitir no terminal um aviso de alta visibilidade em vermelho.

## Comportamento esperado

Exemplo de mensagem:

```text
[A] ATENÇÃO: HOSTNAME FORA DO PADRÃO CONFIGURADO
```

Opcionalmente, em uma segunda linha:

```text
> Padrão esperado: <regra configurada>
```

Não é obrigatório imprimir o hostname completo na mensagem se isso não trouxer benefício operacional.

## Momento da verificação

Preferir uma verificação no boot, depois que a configuração estiver carregada e o hostname puder ser obtido com segurança.

Também garantir que o fluxo `Scripts → Preparar Máquina` continue usando sua lógica atual de detecção/classificação, sem duplicar mecanismos de leitura do hostname desnecessariamente.

Se já existir uma função determinística de validação de hostname, reutilizá-la. Se a lógica estiver embutida em um script, extrair apenas a parte mínima reutilizável, sem refatoração ampla.

## Regras

- mismatch de hostname = aviso, nunca bloqueio;
- regex/configuração inválida não deve ser apresentada como "hostname fora do padrão"; isso é erro de configuração;
- não alterar automaticamente o nome da máquina;
- não solicitar privilégio administrativo apenas para a verificação;
- não exibir informação falsa se o hostname não puder ser obtido.

## Cor do terminal

O componente que renderiza linhas do terminal deve reconhecer o prefixo `[A]`/`ATENÇÃO` e renderizar essa linha em vermelho de forma consistente com erros críticos.

Evitar espalhar regras de cor por múltiplos componentes.

## Critérios de aceite

- [ ] Hostname válido não gera aviso.
- [ ] Hostname fora do padrão gera aviso vermelho claro.
- [ ] A aplicação continua carregando normalmente após o aviso.
- [ ] Regex inválida é tratada como configuração inválida, não como mismatch.
- [ ] `Preparar Máquina` não sofre regressão.
- [ ] Não existe tentativa de renomear o equipamento.

## Testes recomendados

Criar casos determinísticos para a função de validação:

- hostname compatível;
- hostname incompatível;
- regra vazia/opcional, se suportada pelo config atual;
- regex inválida.

## Documentação

Atualizar README/Configurações somente se necessário para explicar que o padrão também é usado como alerta operacional.
