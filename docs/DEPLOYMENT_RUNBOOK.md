# Runbook de implantação

Provedor de infraestrutura ainda não definido.

O repositório não contém Docker, Compose, proxy reverso, configuração HTTPS, CI/CD ou configuração específica de cloud/VPS. Também não há domínio de produção definido no código. Esses componentes devem ser provisionados fora deste pacote conforme o ambiente escolhido.

## Arquitetura mínima

```text
Internet
  -> domínio e HTTPS
  -> frontend estático (SPA)
  -> /api
  -> backend NestJS
  -> PostgreSQL persistente

backend NestJS
  -> DOCUMENT_STORAGE_PATH persistente

recuperação completa
  -> backup PostgreSQL
  +  backup de DOCUMENT_STORAGE_PATH
```

O terminador HTTPS deve servir o frontend e encaminhar `/api` ao backend, removendo esse prefixo porque a API atual não possui prefixo global. Como alternativa, `VITE_API_BASE_URL` pode apontar diretamente para a URL HTTPS pública da API e `CORS_ORIGIN` deve conter a origem HTTPS exata do frontend. Não usar `localhost` em produção.

## Pré-requisitos

- Node.js `^20.19.0` ou `>=22.12.0`, atendendo simultaneamente NestJS 11 e Vite 7.
- npm compatível com o arquivo de lock e instalação reproduzível com `npm ci`.
- PostgreSQL persistente compatível com Prisma 7 e com as migrations versionadas.
- Cliente PostgreSQL com `pg_dump` e `pg_restore` compatíveis com a versão principal do servidor.
- Serviço HTTPS/proxy capaz de servir arquivos estáticos, aplicar fallback de SPA e encaminhar `/api`.
- Diretório persistente e não público para documentos.
- Mecanismo externo de secrets que injete variáveis no processo sem gravá-las no projeto ou nos logs.

## Variáveis e secrets

Não registrar valores destas variáveis em Git, documentação, argumentos de linha de comando ou logs.

| Nome | Obrigatório | Onde será usado |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Backend, Prisma e PostgreSQL |
| `JWT_SECRET` | Sim | Assinatura e validação dos JWTs no backend |
| `PORT` | Sim | Porta de escuta do backend |
| `NODE_ENV` | Sim | Controles de produção, incluindo Swagger e validações |
| `CORS_ORIGIN` | Sim | Origens HTTPS autorizadas pelo backend |
| `DOCUMENT_STORAGE_PATH` | Sim | Diretório persistente de documentos do backend |
| `DOCUMENT_MAX_SIZE_MB` | Sim | Limite de upload de documentos |
| `FINANCIAL_CYCLE_ENABLED` | Sim | Ativação explícita do scheduler financeiro |
| `VITE_API_BASE_URL` | Sim | URL ou caminho `/api` incorporado ao build do frontend |
| `BACKUP_DIR` | Para backup | Destino persistente, externo ao repositório, usado por `db:backup` |

`SMOKE_TEST_PASSWORD` é exclusiva da execução controlada do E2E autenticado e não pertence à configuração normal da aplicação. Ela deve ser injetada como secret protegido antes de iniciar o executor. Não colocar seu valor em código, Git, `.env`, argumentos CLI, documentação ou logs.

## PostgreSQL e migrations

1. Provisionar um banco persistente vazio, com acesso restrito ao backend e transporte protegido pela infraestrutura.
2. Configurar `DATABASE_URL` pelo mecanismo de secrets.
3. Confirmar conectividade sem imprimir a URL.
4. No diretório `backend`, executar `npm.cmd run prisma:migrate:status`.
5. Aplicar migrations somente durante a implantação aprovada com `npm.cmd run prisma:migrate:deploy`.
6. Nunca usar `prisma migrate reset` em produção.

Migrations são a fonte de evolução do schema. Backup não substitui migrations.

## Storage de documentos

`DOCUMENT_STORAGE_PATH` deve apontar para um volume persistente fora de `dist`, gravável somente pelo usuário do processo e não servido diretamente como diretório público. O caminho deve permanecer disponível entre versões do backend e entrar na política de backup. Após uma recuperação, validar pela aplicação a correspondência entre metadados do banco e arquivos.

## Backend

1. Instalar dependências a partir do lockfile.
2. Executar `npm.cmd run build` em `backend`.
3. Confirmar o artefato `backend/dist/src/main.js`.
4. Executar migrations aprovadas.
5. Iniciar com `npm.cmd run start:prod`, que executa `node dist/src/main.js`.
6. Manter a porta definida por `PORT` acessível somente ao proxy ou à rede interna.
7. Verificar `GET /health`: HTTP 200 com banco disponível e HTTP 503 sem detalhes internos quando indisponível.

Swagger fica desabilitado com `NODE_ENV=production`.

## Frontend

1. Definir `VITE_API_BASE_URL` antes do build como `/api` ou URL HTTPS pública da API.
2. Executar `npm.cmd run build` em `frontend`.
3. Publicar apenas os arquivos de `frontend/dist` em um servidor estático.
4. Configurar fallback de SPA: rotas sem arquivo físico devem retornar `index.html`.
5. Servir exclusivamente por HTTPS e não apontar chamadas de produção para `localhost`.
6. Não usar o servidor de desenvolvimento ou `vite preview` como servidor permanente de produção.

## Scheduler financeiro

Implantar inicialmente com `FINANCIAL_CYCLE_ENABLED=false`. Depois de validar migrations, banco, timezone, logs, idempotência e advisory lock, habilitar explicitamente em apenas uma instância responsável ou manter a proteção de concorrência confirmada. Verificar a atualização de cobranças `OVERDUE` e a auditoria da execução.

## Ordem de implantação

1. Provisionar infraestrutura.
2. Provisionar PostgreSQL.
3. Configurar secrets.
4. Configurar storage persistente.
5. Configurar backend e rede interna.
6. Configurar frontend, HTTPS e encaminhamento `/api`.
7. Executar builds do backend e frontend.
8. Executar `prisma migrate deploy` no ambiente aprovado.
9. Iniciar o backend com `start:prod`.
10. Verificar `GET /health`.
11. Verificar frontend e fallback de SPA.
12. Validar login sem registrar credenciais ou token.
13. Habilitar o scheduler financeiro somente após validação explícita.
14. Executar E2E controlado somente com secret protegido e destino aprovado.
15. Monitorar saúde, erros e auditoria sem dados sensíveis.

## Backup e recuperação

A recuperação completa exige os dois componentes:

- banco: `pg_dump`/`pg_restore`, usando `npm.cmd run db:backup` conforme `DATABASE_BACKUP_AND_RECOVERY.md`;
- documentos: cópia protegida e consistente de `DOCUMENT_STORAGE_PATH`.

Manter backups fora do servidor principal, aplicar retenção definida pelo ambiente e testar restore periodicamente em destino isolado. Não executar backup ou restore real como parte da preparação deste pacote.

## Rollback

1. Interromper novas implantações e desabilitar o scheduler, se necessário.
2. Voltar backend e frontend para os artefatos da versão anterior conhecida como estável.
3. Preservar banco e storage; não apagar dados, documentos ou backups.
4. Não executar `prisma migrate reset` nem tentar reverter migrations destrutivamente.
5. Se a versão anterior não for compatível com o schema atual, manter o backend interrompido e seguir o procedimento aprovado de recuperação em `DATABASE_BACKUP_AND_RECOVERY.md`; restaurar banco somente com decisão operacional explícita.
6. Iniciar a versão compatível, verificar `GET /health`, frontend, login e logs.

## E2E autenticado

O comando é `npm.cmd run e2e:smoke`. No executor atual, a execução real permanece bloqueada porque `SMOKE_TEST_PASSWORD` não está disponível por canal seguro. Antes de outra sessão, provisionar a variável no ambiente protegido que inicia o executor e confirmar somente que ela está presente. O teste não aceita fallback e deve preservar autenticação real, fixtures rastreadas, cleanup, AuditLogs e estado original do ADMIN.

## Checklist pós-deploy

- [ ] HTTPS e certificado válidos.
- [ ] Frontend e fallback de SPA funcionando.
- [ ] `/api` encaminhado corretamente, sem exposição direta indevida do backend.
- [ ] `GET /health` retorna HTTP 200.
- [ ] Migrations estão aplicadas e `prisma migrate status` está limpo.
- [ ] Login e `/auth/me` funcionam; nenhum token aparece nos logs.
- [ ] CORS aceita somente a origem configurada.
- [ ] Swagger não está publicado.
- [ ] Upload e download autorizado de documento funcionam no storage persistente.
- [ ] Logs e trilha de auditoria não contêm secrets.
- [ ] Backup do banco e dos documentos está agendado e verificável.
- [ ] Procedimento de restore isolado foi validado.
- [ ] Scheduler permanece desabilitado ou foi habilitado após aprovação explícita.
- [ ] E2E controlado foi executado com cleanup confirmado, quando o secret protegido estiver disponível.
