# FUTURO — Backlog deliberadamente diferido

**Status:** PENDENTE / NÃO IMPLEMENTAR AGORA

## Objetivo

Registrar pontos válidos do feedback técnico que não justificam consumo de tempo/tokens no ciclo atual do TI Director Mode.

Esses itens só devem virar tasks de implementação quando houver problema concreto, necessidade de distribuição maior ou crescimento real do projeto.

---

## 1. Decomposição ampla por domínio

Origem: SEED-005.

`App.jsx` e módulos centrais já mostram concentração de responsabilidade, porém uma refatoração ampla agora tem baixo retorno visível e alto risco de regressão.

### Quando reavaliar

- quando novas features começarem a exigir alterações frequentes nos mesmos arquivos;
- quando a suíte de testes da TASK 04 estiver estabelecida;
- quando existirem fronteiras naturais comprovadas entre network, inventory, deploy e platform/windows.

### Diretriz futura

Refatorar por feature de forma incremental. Nunca big-bang.

---

## 2. Eventos estruturados e histórico local

Origem: SEED-006 + IDEA-001 + IDEA-005.

O terminal/log textual atende o produto atual. Eventos estruturados só passam a valer o custo quando houver necessidade real de histórico, duração, taxa de sucesso ou métricas locais.

### Quando reavaliar

- quando o Deploy precisar de histórico persistente;
- quando houver pedido real de métricas locais;
- quando parsing de log textual estiver limitando uma feature.

Não criar telemetria remota por padrão.

---

## 3. Migração para TypeScript

Origem: SEED-008.

Não implementar neste ciclo.

O ganho existe para contratos de IPC/configuração, mas migrar linguagem agora consome muitos tokens, gera diffs extensos e não aumenta proporcionalmente o valor de portfólio do produto.

### Quando reavaliar

Somente se:

- contratos crescerem significativamente;
- refactors começarem a gerar regressões por shape de objetos;
- houver suíte de testes suficiente para suportar migração incremental.

Nunca reescrever o projeto inteiro de uma vez.

---

## 4. Atualização ampla de Electron/runtime

Origem: SEED-009.

Manter monitorado, mas não realizar upgrade major apenas por existir versão nova.

### Quando reavaliar

- vulnerabilidade relevante;
- incompatibilidade com Windows suportado;
- recurso necessário;
- dependência crítica exigindo upgrade.

Antes de qualquer upgrade: testes + build + validação do portable.

---

## 5. Release profissional, assinatura e supply chain

Origem: SEED-010.

Hash SHA-256 e automação de release podem ser úteis futuramente. Certificado de assinatura de código e pipeline completo não são prioridade enquanto o projeto é principalmente portfólio/open source e distribuição controlada.

### Quando reavaliar

- distribuição corporativa ampla;
- releases públicas frequentes;
- necessidade de reduzir alertas de SmartScreen;
- disponibilização formal de binários pelo GitHub Releases.

---

## 6. Indicadores de risco mais sofisticados

Origem: IDEA-002.

O produto já possui conceito `dangerous` e modal de confirmação para ações destrutivas. Portanto não existe urgência para criar taxonomia completa de leitura/alteração/admin/destrutivo.

### Quando reavaliar

Quando o catálogo crescer ou houver necessidade real de comunicar níveis diferentes de risco na UI.

---

## 7. Preflight completo

Origem: IDEA-003.

A TASK 03 implementa apenas o alerta de hostname, que é o quick win desejado agora. Não criar neste ciclo uma tela completa de preflight com dezenas de checks.

### Quando reavaliar

Quando houver um workflow real que precise validar várias dependências antes de iniciar um rollout/deploy.

---

## 8. Administração remota / RMM / backend / banco / filas

Explicitamente fora de escopo.

Não implementar sem uma mudança real de produto e revisão de threat model.
