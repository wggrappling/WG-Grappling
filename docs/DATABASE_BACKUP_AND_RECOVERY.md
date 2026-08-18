# Backup e recuperação do PostgreSQL

## Escopo e estratégia

O banco usa PostgreSQL por meio do Prisma. O backup operacional usa `pg_dump` no formato custom, que inclui schema, dados, relacionamentos e sequências e permite restauração com `pg_restore`. As migrations versionadas continuam sendo a fonte de evolução do schema; backup não substitui migrations.

Use uma versão de `pg_dump` igual ou mais recente que a versão principal do servidor. Instale as ferramentas cliente PostgreSQL no host operacional e mantenha-as no `PATH`.

## Backup do banco

Configure `DATABASE_URL` e `BACKUP_DIR` no mecanismo protegido do ambiente. `BACKUP_DIR` deve apontar para armazenamento persistente fora do repositório. Não passe senha pela linha de comando, não registre variáveis de ambiente e não salve credenciais nos scripts.

No diretório `backend`, execute:

```powershell
npm.cmd run db:backup
```

O comando cria o diretório quando necessário e produz `wg-grappling-YYYYMMDD-HHmmss.dump`. Ele recusa sobrescrever um arquivo existente, remove somente arquivos incompletos produzidos pela própria tentativa e retorna código diferente de zero em caso de falha.

Valide periodicamente o arquivo sem restaurá-lo:

```powershell
pg_restore --list CAMINHO_DO_BACKUP.dump
```

Recomendação: backup diário, retenção definida conforme requisitos legais e operacionais e uma cópia criptografada fora do servidor principal. Esta aplicação não apaga backups automaticamente.

## Recuperação de banco

Restauração pode sobrescrever objetos e deve ocorrer somente em PostgreSQL temporário/novo, nunca diretamente no banco de produção sem procedimento operacional aprovado.

1. Provisionar uma instância ou banco PostgreSQL temporário vazio.
2. Configurar a autenticação por variáveis protegidas do ambiente ou arquivo externo de credenciais apropriado, sem expor senha na linha de comando.
3. Inspecionar o backup com `pg_restore --list`.
4. Confirmar explicitamente que o destino é temporário e restaurar com `pg_restore --exit-on-error --no-owner --no-privileges --dbname=NOME_DO_BANCO_TEMPORARIO CAMINHO_DO_BACKUP.dump`.
5. Verificar conexão e consultar, sem modificar registros, as tabelas `User`, `Person`, `Student`, `Plan`, `Modality`, `Class`, `Charge`, `Payment`, `Graduation` e `AuditLog`.
6. Conferir contagens básicas, relacionamentos e sequências, e executar uma consulta simples.
7. Apontar temporariamente `DATABASE_URL` para esse banco isolado e executar `npm.cmd run prisma:migrate:status`.
8. Iniciar o backend, testar `GET /health`, validar login e conferir os dados principais.
9. Encerrar a aplicação e remover somente o banco temporário criado para o teste, após nova confirmação explícita do destino.

Não automatizar `DROP DATABASE`, não executar `prisma migrate reset` e não restaurar sobre produção durante testes.

## Backup dos documentos

Os binários dos documentos ficam no diretório configurado por `DOCUMENT_STORAGE_PATH`; o PostgreSQL armazena apenas metadados e referências. Uma recuperação completa exige dois conjuntos sincronizados:

- banco: arquivo produzido por `pg_dump`, restaurado com `pg_restore`;
- arquivos: backup separado e protegido de `DOCUMENT_STORAGE_PATH`.

Defina retenção e cópia externa também para o storage. Não coloque documentos ou backups no Git. Após recuperar ambos, valide pela aplicação se os metadados apontam para arquivos existentes e se as permissões do usuário do processo continuam restritas.
