# P1.17 — Política self-service por estado do Student

Esta decisão define o acesso do papel `ALUNO` conforme o estado persistido do próprio `Student`. O estado é sempre reavaliado no servidor a partir do vínculo `User.studentId`; valores enviados pelo cliente ou presentes no JWT não são autoridade para selecionar o aluno.

## ACTIVE

O aluno com estado `ACTIVE` possui acesso self-service normal, conforme as capacidades e regras já aprovadas para cada módulo.

## PAUSED

O aluno com estado `PAUSED` continua titular dos próprios dados e pode acessar o self-service exclusivamente para consultas próprias. A pausa não remove o aluno, o `User`, nem o vínculo entre eles.

`PAUSED` não permite operações acadêmicas ou comerciais que alterem estado e não concede qualquer permissão administrativa. Endpoints ainda inexistentes não são criados por esta decisão.

## INACTIVE

O aluno com estado `INACTIVE` não possui contexto self-service. O acesso permanece bloqueado de forma fail-closed.

## Reativação

A transição `PAUSED → ACTIVE` restaura as capacidades operacionais previstas pelas regras existentes. A reativação não exige criar outro `User`, outro `Student`, outro vínculo ou alterar o JWT.

## Segurança e ownership

O ownership permanece exclusivamente server-side:

```text
authenticated User
  → persisted User.studentId
  → authenticated Student
  → recurso próprio filtrado pelo Student
```

O cliente não escolhe `studentId` por URL, query, body ou JWT. `PAUSED` não recebe acesso a dados de terceiros nem permissões dos papéis `OWNER`, `ADMIN`, `RECEPTION` ou `TEACHER`.
