# WG Grappling

SaaS de gestão para academias de artes marciais: alunos, turmas, presença, planos, cobrança e documentos.

O repositório contém dois projetos independentes, sem workspace compartilhado na raiz:

- `backend/` — API em NestJS 11 + Prisma 7 + PostgreSQL
- `frontend/` — SPA em React 19 + TypeScript + Vite

## Stack

| Camada    | Tecnologias |
|-----------|-------------|
| Backend   | NestJS 11, TypeScript, Prisma ORM 7, PostgreSQL 17, JWT (`@nestjs/passport`), Swagger |
| Frontend  | React 19, TypeScript, Vite 7, React Router 7, Axios |

## Pré-requisitos

- Node.js `^20.19.0` ou `>=22.12.0`
- PostgreSQL 17

## Backend

```bash
cd backend
npm install
cp .env.example .env   # ajuste DATABASE_URL, JWT_SECRET etc.
npx prisma migrate dev
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api` (desabilitado quando `NODE_ENV=production`)
- Health check: `GET /health`

Scripts principais (`backend/package.json`):

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | inicia a API em modo watch |
| `npm run build` | build de produção (`nest build`) |
| `npm run test` | testes unitários (Jest) |
| `npm run test:e2e` | testes e2e |
| `npm run lint` | eslint com `--fix` |
| `npm run prisma:generate` | regenera o Prisma Client (saída em `backend/generated/prisma`) |
| `npm run prisma:migrate:deploy` | aplica migrations pendentes (produção) |
| `npm run financial:cycle` | executa manualmente o ciclo financeiro |
| `npm run db:backup` | executa o backup do banco (`scripts/db-backup.js`) |

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`

Scripts principais (`frontend/package.json`):

| Comando | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | build de produção (`tsc -b && vite build`) |
| `npm run preview` | serve o build de produção localmente |

## Documentação

Documentos operacionais e de infraestrutura ficam em [docs/](docs/):

- [docs/INFRASTRUCTURE_DECISION.md](docs/INFRASTRUCTURE_DECISION.md) — requisitos de infraestrutura para produção
- [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) — passo a passo de deploy
- [docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md) — deploy na Render
- [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md) — backup e recuperação do banco
- [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) — checklist antes de subir em produção

Orientações para trabalhar no código com o Claude Code estão em [CLAUDE.md](CLAUDE.md).
