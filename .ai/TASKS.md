---  
# TI Director Mode — Tasks  

  

## Bugs  

  

### BUG-001 — Preparar máquina não conclui fluxo de Office  

  

Estado: investigação.  

  

Sintoma relatado:  

  

- Instalações funciona;  

- Preparar Máquina não consegue concluir o fluxo de rede;  

- unidade não aparece mapeada;  

- arquivo configurado não é aberto.  

  

Não corrigir antes de confirmar a causa.  

  

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

- versionamento inconsistente entre package/changelog/build;  

- divergência entre estado local do ZIP e estado publicado no GitHub;  

- documentação de segurança de credenciais precisa ser validada contra a implementação atual.  

  

Não adicionar novas dívidas sem evidência.  