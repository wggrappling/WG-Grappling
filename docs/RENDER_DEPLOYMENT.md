# Implantação do WG Grappling no Render

## Escopo

Este runbook prepara a arquitetura já definida para o Render sem criar serviços, banco, disco, domínio ou credenciais e sem executar deploy, migration, scheduler, backup, restore ou E2E.

## Arquitetura

```text
Internet / HTTPS
  ├─ Render Static Site → frontend React/Vite
  └─ Render Web Service → backend NestJS
                              ├─ Render PostgreSQL
                              └─ Render Persistent Disk → documentos
```

- O Static Site serve exclusivamente o conteúdo compilado do frontend.
- O Web Service mantém a API e, quando habilitado, o scheduler em execução contínua.
- O Render PostgreSQL armazena dados operacionais, financeiros, referências dos documentos e auditoria.
- O Persistent Disk armazena os binários referenciados por `DOCUMENT_STORAGE_PATH`.

## Backend — Render Web Service

Configuração do serviço no monorepo:

| Campo | Configuração |
| --- | --- |
| Runtime | Node |
| Branch | Branch de produção aprovada |
| Root Directory | `backend` |
| Build Command | `npm ci && npm run build` |
| Pre-Deploy Command | `npm run prisma:migrate:deploy` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |

O Pre-Deploy Command é a posição apropriada para migrations porque o Render o executa depois do build e antes do start. Ele está disponível apenas nos tipos de serviço que oferecem esse recurso. Se o plano escolhido não o oferecer, a migration inicial deverá ser executada uma única vez por mecanismo operacional controlado e aprovado antes de iniciar a versão nova; não anexar migration ao processo contínuo nem executá-la concorrentemente em múltiplas instâncias.

### Compatibilidade

- Build: `nest build`, gerando `dist/src/main.js`.
- Start: `node dist/src/main.js` por meio de `npm run start:prod`.
- Node.js: configurar no Render uma versão que satisfaça `^20.19.0` ou `>=22.12.0`; usar uma linha LTS compatível e mantê-la explícita no serviço.
- Rede: o NestJS escuta em `0.0.0.0` e usa a `PORT` fornecida pelo ambiente. O Render fornece `PORT` ao Web Service; não fixar a porta de produção no código.
- Processo contínuo: compatível. O Web Service mantém a API ativa e registra o cron durante o bootstrap quando o scheduler está habilitado.
- HTTPS: terminado e gerenciado pelo ponto de entrada do Render; o processo NestJS recebe tráfego encaminhado na porta interna.
- Swagger: desabilitado com `NODE_ENV=production`.

## Frontend — Render Static Site

| Campo | Configuração |
| --- | --- |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

O build executa `tsc -b && vite build`. `VITE_API_BASE_URL` deve ser definido no ambiente de build do Static Site com a URL HTTPS pública do Web Service. O valor é incorporado aos arquivos estáticos e não pode ser secret.

Como frontend e backend são serviços Render separados, não usar o fallback local `/api` em produção sem um proxy adicional. A configuração direta para a URL pública HTTPS do backend é a opção compatível com a arquitetura definida; `CORS_ORIGIN` no backend deve conter a origem HTTPS exata do Static Site.

### SPA fallback

Adicionar no Static Site uma regra de **Rewrite**:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | `Rewrite` |

Isso preserva as rotas do React Router ao acessar ou atualizar diretamente páginas como `/students` e `/dashboard`.

### Referências a localhost

Não há `localhost` hardcoded no runtime de produção do frontend. As referências encontradas ficam apenas no proxy do servidor de desenvolvimento e nos arquivos de exemplo locais. O runtime usa `VITE_API_BASE_URL` e, sem configuração, cai em `/api`; por isso a variável deve ser configurada no Static Site antes do build.

## Persistent Disk e documentos

O storage atual é compatível com um Render Persistent Disk porque `LocalStorageAdapter` usa filesystem e aceita um caminho absoluto em `DOCUMENT_STORAGE_PATH`.

Configuração recomendada:

- Mount Path do disco: `/var/data/documents`;
- `DOCUMENT_STORAGE_PATH`: o mesmo caminho absoluto;
- acesso: somente o usuário do processo backend deve ler e gravar;
- exposição: o diretório não deve ser publicado; upload e download continuam passando pela autorização da API;
- Git: nunca adicionar documentos, snapshots ou backups ao repositório.

Somente arquivos gravados abaixo do mount path persistem entre deploys e restarts; o restante do filesystem do serviço é efêmero. O adapter cria o diretório quando necessário, mas o disco precisa estar anexado ao Web Service antes do primeiro uso.

### Limitações do Persistent Disk

- O disco fica acessível a somente uma instância do serviço; o Web Service com disco não pode escalar horizontalmente para múltiplas instâncias.
- O disco não fica disponível durante build ou pre-deploy, o que não impede as migrations porque elas acessam PostgreSQL e não documentos.
- Deploys do serviço com disco não são zero-downtime: a instância anterior é interrompida antes da nova assumir.
- O disco deve ser dimensionado e monitorado; aumentar é possível, reduzir não.

### Backup de documentos

Os snapshots automáticos do Persistent Disk são uma proteção da plataforma, mas não substituem a política de recuperação completa do projeto. Manter backup separado e protegido dos documentos, com retenção aprovada e teste de restauração. A restauração deve coordenar o estado do disco com os metadados do PostgreSQL.

## Render PostgreSQL e Prisma

- Configurar `DATABASE_URL` no Web Service com a URL interna do Render PostgreSQL sempre que banco e backend estiverem na mesma conta e região.
- Não copiar a URL para o repositório, documentação, argumentos ou logs.
- O Prisma usa `DATABASE_URL` tanto no runtime quanto nas migrations.
- Aplicar `npm run prisma:migrate:deploy` após o build e antes do start da primeira versão.
- Confirmar depois do deploy que `npm run prisma:migrate:status` está limpo por mecanismo operacional aprovado.
- Nunca executar `prisma migrate reset` em produção.
- Manter backend e banco na mesma região para usar a rede privada e reduzir latência.

## Variáveis no Render

| Nome | Finalidade | Onde configurar |
| --- | --- | --- |
| `DATABASE_URL` | Conexão do Prisma com o Render PostgreSQL. | Web Service; secret. |
| `JWT_SECRET` | Assinatura e validação dos JWTs; mínimo de 32 caracteres. | Web Service; secret. |
| `PORT` | Porta interna em que o NestJS escuta. | Web Service; fornecida pelo ambiente Render. |
| `NODE_ENV` | Ativa validações e comportamento de produção, incluindo Swagger desabilitado. | Web Service. |
| `CORS_ORIGIN` | Origem HTTPS exata autorizada para o Static Site. | Web Service. |
| `DOCUMENT_STORAGE_PATH` | Caminho absoluto montado pelo Persistent Disk. | Web Service. |
| `DOCUMENT_MAX_SIZE_MB` | Limite máximo aceito por upload de documento. | Web Service. |
| `FINANCIAL_CYCLE_ENABLED` | Liga ou desliga o scheduler financeiro. | Web Service; `false` no primeiro deploy. |
| `VITE_API_BASE_URL` | URL HTTPS pública da API incorporada ao build Vite. | Static Site, no ambiente de build. |

Nenhum valor ou credencial deve ser colocado neste documento. `VITE_API_BASE_URL` e `CORS_ORIGIN` dependem das URLs atribuídas aos serviços e só podem ser preenchidos depois que esses endpoints forem conhecidos.

## Health check

Configurar o Health Check Path do Web Service como `/health`.

- HTTP 200: processo da aplicação saudável e consulta `SELECT 1` no banco bem-sucedida.
- HTTP 503: PostgreSQL indisponível; a resposta não expõe detalhes internos.

O comportamento atual já atende ao requisito e não deve ser alterado. O primeiro deploy só é considerado saudável quando o Render observar HTTP 200.

## Scheduler financeiro

- No primeiro deploy, configurar obrigatoriamente `FINANCIAL_CYCLE_ENABLED=false`.
- Não executar o scheduler durante a preparação ou durante a validação inicial da infraestrutura.
- Depois de validar migrations, `/health`, login, timezone, logs, idempotência e advisory lock, habilitar explicitamente.
- O padrão de cron é diário às 05:00 em `America/Sao_Paulo`.
- O scheduler roda dentro do Web Service; o processo precisa permanecer ativo.
- O advisory lock no PostgreSQL protege contra concorrência, mas o Persistent Disk já limita este serviço a uma instância.
- Um disparo perdido durante restart ou indisponibilidade não possui catch-up automático; o próximo ocorre no próximo horário do cron.

## Ordem do deploy inicial

1. Criar o Render PostgreSQL na região escolhida.
2. Criar o backend como Render Web Service na mesma região.
3. Criar e anexar o Persistent Disk ao Web Service em `/var/data/documents`.
4. Configurar secrets e variáveis do backend, mantendo `FINANCIAL_CYCLE_ENABLED=false`.
5. Configurar `DATABASE_URL` com a URL interna do Render PostgreSQL.
6. Executar o build do backend.
7. Executar `npm run prisma:migrate:deploy` no pre-deploy ou por procedimento controlado equivalente.
8. Iniciar o backend com `npm run start:prod`.
9. Validar `GET /health` e exigir HTTP 200.
10. Criar o frontend como Render Static Site.
11. Configurar `VITE_API_BASE_URL` com a URL HTTPS pública do backend e refazer o build.
12. Validar o frontend e a regra SPA de rewrite.
13. Testar login sem registrar credenciais ou token.
14. Habilitar o scheduler somente depois da validação explícita.

Este documento descreve a ordem futura; nenhuma dessas ações foi executada nesta preparação.

## Backup e recuperação

Uma recuperação completa exige dois conjuntos:

- PostgreSQL: backup gerenciado e/ou `pg_dump` em formato custom, com restauração validada por `pg_restore` em banco temporário e isolado;
- documentos: backup protegido do Persistent Disk, restaurado em coordenação com os metadados do banco.

Não considerar migrations como backup. Definir retenção e cópia externa antes de produção e validar periodicamente o procedimento de restore sem sobrescrever diretamente o ambiente de produção.

## Rollback no Render

O runbook geral já exige preservar banco e documentos, evitar reversão destrutiva de migrations e voltar aplicação/frontend a artefatos compatíveis. Para o Render:

1. Manter `FINANCIAL_CYCLE_ENABLED=false` durante a recuperação, se houver risco de processamento.
2. Interromper novos deploys e selecionar uma revisão anterior conhecida como estável para o Web Service e o Static Site.
3. Não remover, recriar ou formatar o Render PostgreSQL nem o Persistent Disk durante rollback de código.
4. Verificar se a revisão anterior é compatível com o schema já migrado. Se não for, manter o backend indisponível e seguir o procedimento aprovado de recuperação.
5. Restaurar PostgreSQL somente em destino controlado conforme `DATABASE_BACKUP_AND_RECOVERY.md`; não presumir que rollback de deploy reverte dados ou migrations.
6. Restaurar documentos separadamente quando necessário e validar a correspondência com os registros do banco.
7. Após voltar a revisão compatível, validar `/health`, frontend, SPA fallback, login, upload/download autorizado e logs.

O comportamento exato de retenção de deploys, banco e snapshots depende do plano e das configurações escolhidas no Render. Ele deve ser confirmado no Dashboard antes da implantação; não é presumido por este runbook.

## E2E

- Estado: **PREPARADO/BLOQUEADO**.
- Comando preparado: `npm.cmd run e2e:smoke`.
- Bloqueio atual: `SMOKE_TEST_PASSWORD` não está disponível no executor atual por canal seguro.
- Não executar E2E, não usar fallback e não inserir a senha em código, `.env`, documentação, argumentos ou logs.

## Checklist antes de criar os serviços

- [ ] Região comum definida para Web Service e PostgreSQL.
- [ ] Root directories, comandos e health check revisados.
- [ ] Versão Node LTS compatível definida no Render.
- [ ] Persistent Disk planejado em `/var/data/documents`.
- [ ] Secrets preparados em canal protegido.
- [ ] Origem do Static Site e URL pública do Web Service conhecidas para CORS e Vite.
- [ ] Migration inicial aprovada e posicionada antes do start.
- [ ] Rewrite `/*` → `/index.html` planejado.
- [ ] Backup e restore de banco e documentos definidos.
- [ ] Scheduler confirmado como desabilitado no primeiro deploy.

## Fontes oficiais do Render

- Web Services e bind de porta: <https://render.com/docs/web-services>
- Static Sites: <https://render.com/docs/static-sites>
- Redirects e rewrites: <https://render.com/docs/redirects-rewrites>
- Persistent Disks: <https://render.com/docs/disks>
- Render PostgreSQL: <https://render.com/docs/postgresql-creating-connecting>
- Pre-deploy e ciclo de deploy: <https://render.com/docs/deploys>
