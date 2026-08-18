# Checklist de produção

1. Configurar `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV=production`, `CORS_ORIGIN`, `DOCUMENT_STORAGE_PATH`, `DOCUMENT_MAX_SIZE_MB` e `FINANCIAL_CYCLE_ENABLED`.
2. Provisionar o PostgreSQL e restringir as credenciais ao ambiente de produção.
3. Executar `npm.cmd run prisma:migrate:deploy` no backend.
4. Criar o diretório persistente definido em `DOCUMENT_STORAGE_PATH` e conceder acesso somente ao usuário do processo.
5. Definir `CORS_ORIGIN` com a origem HTTPS exata do frontend; não usar `*`.
6. Gerar um `JWT_SECRET` aleatório com pelo menos 32 caracteres e armazená-lo no gerenciador de segredos da plataforma.
7. Executar `npm.cmd run build` no backend e no frontend, com `VITE_API_BASE_URL` apontando para a API pública ou para o proxy `/api`.
8. Iniciar o backend com `npm.cmd run start:prod`.
9. Servir os artefatos estáticos de `frontend/dist` por um servidor web apropriado.
10. Confirmar que `GET /health` retorna HTTP 200; indisponibilidade do banco deve retornar HTTP 503 sem detalhes internos.
11. Verificar os logs de inicialização e erros, sem credenciais, tokens ou dados sensíveis.
12. Manter `FINANCIAL_CYCLE_ENABLED=false` até validar banco, migrations, horário, idempotência e execução manual controlada; habilitar explicitamente somente depois.
