---  
# TI Director Mode — Tasks  

  

## Bugs  

  

### BUG-001 — Preparar máquina não conclui fluxo de Office  

Estado: Resolvido e validado pelo usuário.

Sintoma original:  
- Instalações funciona;  
- Preparar Máquina não conseguia concluir devido a bloqueios na tentativa de mapeamento de rede;  
- arquivo configurado não era aberto.  

Solução aplicada:  
- Desacoplamento da etapa de mapeamento de rede (`ensureSoftMapped`, `net use`, unidade `S:`) da execução do `Preparar máquina nova`.
- Detecção dinâmica de prefixo de notebook e abertura direta do Office correspondente.
- Validação realizada e confirmada com sucesso pelo usuário.  


  

## Melhorias  

  

Nenhuma melhoria adicional registrada nesta auditoria.  

  

## Testes pendentes  

  

- reproduzir o bug com caminho TXT;  

- capturar saída completa do `net use`;  

- verificar resultado da unidade configurada;  

- verificar acesso direto ao UNC;  

- confirmar identidade do processo;  

- confirmar código de retorno do processo;  

- confirmar caminho final utilizado pelo script.  

  

## Documentação  

  

- criar memória operacional persistente em `.ai/`;  

- registrar divergências entre documentação e implementação;  

- manter estado atual atualizado após mudanças.  

  

## Dívida técnica  

- ausência de suíte automatizada;  
- divergência entre estado local do ZIP e estado publicado no GitHub;  
- documentação de segurança de credenciais precisa ser validada contra a implementação atual.  


  

Não adicionar novas dívidas sem evidência.  