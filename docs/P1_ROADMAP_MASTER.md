# ROADMAP MASTER — RECUPERAÇÃO DO PLANO P1

Este documento formaliza o roadmap P1 recuperado a partir das evidências atualmente disponíveis no repositório e no histórico de implementação.

- O roteiro mestre original não foi localizado no repositório.
- Este documento é uma reconstrução baseada nas evidências disponíveis.
- A ausência de um P1 não significa que ele esteja pendente.
- “NÃO LOCALIZADO” significa apenas ausência de evidência suficiente.
- Este documento passa a ser o registro operacional do roadmap recuperado.
- Futuros P1 só devem ser adicionados mediante decisão explícita.

## 1. Baseline

- **HEAD:** `e0c3fa4db0c45ab0a78849e32742dc976683822d`
- **origin/main:** `e0c3fa4db0c45ab0a78849e32742dc976683822d`
- **Estado:** `main` sem divergência.

## 2. P1 documentados

Fonte: `docs/UI_UX_ACCESS_ARCHITECTURE.md`.

- **P1.7 — Arquitetura de acessos e UI/UX**
- **P1.8 — Contratos operacionais**
- **P1.9 — Contrato consolidado do ALUNO e LOJA**
- **P1.10 — Identidade e autorização do ALUNO**
- **P1.11 — Cardinalidade User ↔ Student e contratos Self-Service**
- **P1.12 — Contratos HTTP e projeções Self-Service**
- **P1.13 — Decisões funcionais finais do ALUNO**
- **P1.14 — Arquitetura técnica do Self-Service /me**
- **P1.15 — Decisões finais da migration e plano da Fase 1**

Fonte adicional: `docs/STUDENT_PAUSED_SELF_SERVICE_POLICY.md`.

- **P1.17 — Política self-service por estado do Student**

## 3. P1 recuperados pelo histórico de implementação

Os itens abaixo estão **CONCLUÍDOS / PUBLICADOS**.

- **P1.16 — Fundação do Self-Service**  
  Commit/checkpoint: `d04940dfcf0d01c7d289807a231e275dbcf2fb11`
- **P1.17 — Política ACTIVE / PAUSED / INACTIVE**  
  Commit: `167b92a4573f1b3a211e96a456c1b58a9142bf10`
- **P1.18 — Visões acadêmicas do aluno**  
  Commit: `4d88b5fc7187572a466619a2668b6e5c3e212190`
- **P1.19 — Interface mobile do Self-Service**  
  Commit: `adfeddf3b128150f7ce13a28a9b8b295be9e3942`
- **P1.20 — Fundação da Loja**  
  Commit: `99f4e25bd1abd0a415526d96e7ca13e5123a4614`
- **P1.21 — Operações da Loja**  
  Commit: `e361a75cba0f680beac090eca95e4b3f01cd0b69`
- **P1.22 — Refinamento da UX da Loja**  
  Commit: `0c9e651430d89006532eb904e4eb689b4a48f196`
- **P1.23 — Avisos do aluno**  
  Commit: `5ea1ef761ad0b9880de9fe03035dd019e0356e06`
- **P1.24 — Documentos do aluno**  
  Commit: `65c87404766864457388acb5b54ede09c5124f18`
- **P1.25 — Perfil do aluno**  
  Commit: `bdfd9da2e13dd6ca93e78fd3ddb2683c477d6097`
- **P1.26 — Agenda do aluno**  
  Commit: `295fe4c1ec971c64e343ad084df869ea9496eae9`
- **P1.27 — Dashboard do aluno**  
  Commit: `062fa686b75b191d98f02a10dc95da26da32b4a2`
- **P1.28 — Fechamento do ciclo Self-Service**  
  Commit: `59177915d79ab1726d408de48e6cf4b4ef64c2ff`
- **P1.29 — Operações de pagamento/liberação da Loja**  
  Commit: `12d683b2ef5dfd6bbf7d7d2397a6832996ec4975`
- **P1.30 — Controle operacional de estoque**  
  Commit: `e0c3fa4db0c45ab0a78849e32742dc976683822d`

## 4. P1.1–P1.6

- **P1.1 — EVIDÊNCIA INSUFICIENTE**
- **P1.2 — EVIDÊNCIA INSUFICIENTE**
- **P1.3 — EVIDÊNCIA INSUFICIENTE**
- **P1.4 — EVIDÊNCIA INSUFICIENTE**
- **P1.5 — EVIDÊNCIA INSUFICIENTE**
- **P1.6 — EVIDÊNCIA INSUFICIENTE**

Não localizados no material atualmente recuperado. A ausência não permite concluir que estejam pendentes.

## 5. P1.31+

**P1.31 — NÃO LOCALIZADO**

Não existe atualmente evidência documental ou de histórico Git suficiente para definir o conteúdo do P1.31.

Não é possível determinar o último P1 previsto pelo roteiro original.

Nenhum P1.32, P1.33 ou posterior é criado como tarefa existente.

## 6. Matriz consolidada

| P1 | Status | Fonte/Evidência | Commit | Observação |
|---|---|---|---|---|
| P1.1 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.2 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.3 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.4 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.5 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.6 | EVIDÊNCIA INSUFICIENTE | — | — | Não localizado; ausência não indica pendência. |
| P1.7 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.8 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.9 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.10 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.11 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.12 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.13 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.14 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.15 | DOCUMENTADO | `UI_UX_ACCESS_ARCHITECTURE.md` | — | Título e conteúdo efetivamente documentados. |
| P1.16 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `d04940dfcf0d01c7d289807a231e275dbcf2fb11` | — |
| P1.17 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints; `STUDENT_PAUSED_SELF_SERVICE_POLICY.md` | `167b92a4573f1b3a211e96a456c1b58a9142bf10` | — |
| P1.18 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `4d88b5fc7187572a466619a2668b6e5c3e212190` | — |
| P1.19 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `adfeddf3b128150f7ce13a28a9b8b295be9e3942` | — |
| P1.20 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `99f4e25bd1abd0a415526d96e7ca13e5123a4614` | — |
| P1.21 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `e361a75cba0f680beac090eca95e4b3f01cd0b69` | — |
| P1.22 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `0c9e651430d89006532eb904e4eb689b4a48f196` | — |
| P1.23 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `5ea1ef761ad0b9880de9fe03035dd019e0356e06` | — |
| P1.24 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `65c87404766864457388acb5b54ede09c5124f18` | — |
| P1.25 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `bdfd9da2e13dd6ca93e78fd3ddb2683c477d6097` | — |
| P1.26 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `295fe4c1ec971c64e343ad084df869ea9496eae9` | — |
| P1.27 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `062fa686b75b191d98f02a10dc95da26da32b4a2` | — |
| P1.28 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `59177915d79ab1726d408de48e6cf4b4ef64c2ff` | — |
| P1.29 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `12d683b2ef5dfd6bbf7d7d2397a6832996ec4975` | — |
| P1.30 | CONCLUÍDO / PUBLICADO | Histórico de implementação/checkpoints | `e0c3fa4db0c45ab0a78849e32742dc976683822d` | — |
| P1.31 | NÃO LOCALIZADO | — | — | Conteúdo não determinável; não criar descrição. |

## 7. Estado do projeto

- **Último P1 confirmado:** P1.30
- **Último commit confirmado:** `e0c3fa4db0c45ab0a78849e32742dc976683822d`
- **Próximo P1:** NÃO DETERMINADO
- **Total de P1 do roteiro original:** DESCONHECIDO
- **P1 restantes:** NÃO DETERMINÁVEL
- **Percentual do roadmap:** NÃO DETERMINÁVEL

Não é possível calcular percentual sem conhecer o total original.

## 8. Regra para o futuro

- Não criar um novo P1 apenas pela sequência numérica.
- Todo novo P1 deve possuir objetivo explícito, contrato, implementação, auditoria e checkpoint.
- Quando o roadmap original não fornecer o próximo P1, a decisão do próximo bloco deve ser feita explicitamente antes da implementação.

