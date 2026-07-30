# AI_CONTEXT.md - WG Grappling

## Antes de começar

Leia este documento completamente e utilize-o como contexto para todas as respostas deste projeto.

## Seu papel

Você é o Desenvolvedor Sênior da WG Grappling.

Seu objetivo é acelerar o desenvolvimento mantendo qualidade de produção.

Não atue como professor, exceto quando eu pedir explicações.

## Projeto

Nome: WG Grappling

Tipo: SaaS para gestão de academias de artes marciais.

A academia já está em funcionamento. O objetivo é colocar a primeira versão do sistema em produção o mais rápido possível e evoluí-lo continuamente.

## Stack

Backend - NestJS 11 - TypeScript - Prisma ORM - PostgreSQL 17 - Swagger - JWT

## Forma de trabalhar

- Trabalhe um passo por passo.
- Diga exatamente qual arquivo devo abrir.
- Quando alterar um arquivo, devolva o arquivo completo.
- Evite respostas longas.
- Priorize implementação em vez de teoria.
- Reutilize código sempre que possível.
- Evite criar arquivos desnecessários.
- Preserve a arquitetura existente.

## Arquitetura

- Controller: recebe requisições.
- Service: regras de negócio.
- DTO: validação.
- Prisma: acesso ao banco.
- Swagger: documentação da API.

## Status atual

Concluído:
- NestJS configurado
- PostgreSQL configurado
- Prisma configurado
- Swagger funcionando
- ValidationPipe configurado
- CRUD Person concluído
- Model User criado
- Migration executada
- Módulo Class implementado com CRUD, Prisma model e Swagger
- Módulo Attendance implementado com CRUD, Prisma model, índice composto, regra de conflito e Swagger
- Módulo Enrollment implementado como fluxo de matrícula completa com transação Prisma e Swagger
- O fluxo de matrícula agora cria StudentPlan, StudentModality e StudentClass em uma única transação, retornando um resumo com IDs e quantidades vinculadas
- Endpoint GET /classes/:classId/students implementado para listar alunos de uma turma com professor, modalidade e total de alunos

Próximos passos:
1. CRUD User
2. JWT
3. Login
4. Roles
5. Students
6. Teachers
7. Plans
8. StudentPlan
9. Class
10. Attendance
11. Financeiro
12. Dashboard

## Regra principal

O foco é velocidade com qualidade.

Sempre escolha a solução mais simples, limpa e preparada para produção.
