# Decisão de infraestrutura para produção

## Escopo

Este documento define os requisitos de infraestrutura da primeira versão do WG Grappling. Não escolhe fornecedor, não provisiona recursos e não contém credenciais. Os requisitos sem base mensurável no repositório são marcados como **não determinado**.

## 1. Arquitetura atual

### Frontend

- Tecnologia: React 19, TypeScript, React Router e Axios, empacotados com Vite 7.
- Build: `npm.cmd run build`, que executa `tsc -b && vite build`.
- Diretório de saída: `frontend/dist`.
- Hospedagem: arquivos estáticos servidos exclusivamente por HTTPS.
- Rotas: exige SPA fallback para `index.html`, pois as rotas são resolvidas no navegador.
- API: `VITE_API_BASE_URL` é incorporada no build. Pode ser `/api` quando houver reverse proxy na mesma origem ou uma URL HTTPS pública da API.

### Backend

- Tecnologia: NestJS 11, TypeScript, Prisma 7, JWT, Swagger e driver PostgreSQL.
- Node.js: `^20.19.0` ou `>=22.12.0`, requisito conjunto documentado para NestJS 11 e Vite 7.
- Build: `npm.cmd run build`.
- Artefato esperado: `backend/dist/src/main.js`.
- Inicialização: `npm.cmd run start:prod`, que executa `node dist/src/main.js`.
- Porta: variável obrigatória `PORT`; o exemplo local usa `3000`. A porta de produção final é **não determinada** e deve ficar acessível apenas ao proxy ou à rede interna.
- Processo: deve permanecer continuamente ativo e reiniciar automaticamente após falha ou reinício do host.
- Health check: `GET /health`; retorna HTTP 200 com `{ status: "ok", database: "up" }` e HTTP 503 quando o PostgreSQL está indisponível.
- Produção: CORS aceita somente as origens de `CORS_ORIGIN`; Swagger é desabilitado quando `NODE_ENV=production`.

### Banco de dados

- Tecnologia: PostgreSQL por meio do Prisma ORM 7 e do adapter `pg`.
- Versão: PostgreSQL 17 é a versão adotada na documentação do projeto. A menor versão de servidor compatível não está fixada pelo código: **não determinado**.
- Schema: `backend/prisma/schema.prisma`.
- Evolução: migrations versionadas em `backend/prisma/migrations` e aplicadas em produção com `npm.cmd run prisma:migrate:deploy` durante uma implantação aprovada.
- Persistência: obrigatória. Banco efêmero causa perda de dados operacionais, financeiros e de auditoria.
- Conexões: quantidade máxima e tamanho de pool **não determinados**; devem ser definidos após medição e conforme os limites do ambiente escolhido.

### Storage de documentos

- Configuração: `DOCUMENT_STORAGE_PATH`, obrigatória em produção.
- Implementação atual: `LocalStorageAdapter`, baseado em filesystem local.
- Conteúdo: PostgreSQL guarda metadados e referências; os binários ficam no diretório configurado.
- Persistência: obrigatória e independente do ciclo de vida do build ou processo backend.
- Permissões: diretório não público, gravável somente pelo usuário do backend e nunca localizado em `dist` ou no repositório.
- Backup: obrigatório e separado do backup PostgreSQL; a restauração completa exige os dois conjuntos.

### Financial Cycle Scheduler

- Execução: cron dentro do processo NestJS; portanto, o backend precisa permanecer continuamente ativo.
- Ativação: `FINANCIAL_CYCLE_ENABLED`; o padrão fora de produção é `false` e em produção a variável é obrigatória. A implantação inicial deve mantê-la em `false` até validação operacional.
- Frequência padrão: diária às 05:00 (`0 5 * * *`), no timezone `America/Sao_Paulo`; ambos podem ser configurados.
- Concorrência: usa `pg_try_advisory_xact_lock(1196843846)` dentro de transação serializável. Uma execução que não obtém o lock é ignorada.
- Restart: o cron é registrado quando o módulo inicia, se habilitado. Não há mecanismo de catch-up; uma execução perdida durante indisponibilidade não é automaticamente recuperada após restart. O próximo disparo ocorre no próximo horário calculado pelo cron.

## 2. Requisitos mínimos

### Backend

| Requisito | Definição |
| --- | --- |
| CPU | **Não determinado**; não há perfil de carga ou benchmark. |
| RAM | **Não determinado**; não há medição de consumo em produção. |
| Disco | **Não determinado**; logs, artefato e crescimento não foram medidos. O storage de documentos deve usar capacidade persistente separadamente planejada. |
| Node.js | `^20.19.0` ou `>=22.12.0`. Preferir uma linha LTS compatível. |
| Porta | Configurada por `PORT`; valor final **não determinado** e não exposto diretamente à internet. |
| Processo | Um processo contínuo com reinício automático, logs e health check. |

### PostgreSQL

| Requisito | Definição |
| --- | --- |
| Versão | PostgreSQL 17 conforme arquitetura documentada; versão mínima compatível **não determinada**. |
| Armazenamento | Persistente; capacidade inicial e crescimento **não determinados**. |
| Conexões | Limite e pool **não determinados**; configurar após teste de carga e limites do serviço. |
| Backup | `pg_dump` em formato custom, cópia protegida fora do host principal e restauração com `pg_restore`. O cliente `pg_dump` deve ter versão igual ou superior à principal do servidor. |

### Storage

| Requisito | Definição |
| --- | --- |
| Capacidade inicial | **Não determinada**; não há volume de alunos, documentos ou retenção definido. |
| Persistência | Volume durável montado em `DOCUMENT_STORAGE_PATH`. |
| Backup | Cópia separada, protegida e externa ao servidor principal, coordenada com o backup do banco. |

### Frontend

- Hospedagem estática do conteúdo de `frontend/dist`.
- HTTPS obrigatório.
- SPA fallback obrigatório.
- Build feito com `VITE_API_BASE_URL` definido para `/api` ou para a URL HTTPS da API.

## 3. Comparação das topologias

| Critério | A — Tudo em uma VPS | B — Aplicação + PostgreSQL gerenciado | C — Aplicação + PostgreSQL + storage gerenciados |
| --- | --- | --- | --- |
| Complexidade | Baixa para iniciar; concentra configuração no mesmo host. | Média; separa banco e aplicação, exigindo rede e credenciais entre ambientes. | Alta no estado atual; exige banco e storage externos e um novo adapter para storage de objetos. |
| Custo relativo | **BAIXO** | **MÉDIO** | **ALTO** |
| Manutenção | Alta responsabilidade interna: SO, PostgreSQL, proxy, certificados, disco e aplicação. | Média: equipe mantém aplicação, volume documental, proxy e SO; operação do banco é delegada. | Menor operação de dados após adaptação, mas maior integração e dependência dos serviços. |
| Backup | Manual/automatizado pela equipe para banco e documentos; ambos no mesmo host aumentam risco sem cópia externa. | Banco pode usar recursos gerenciados, mas documentos ainda exigem rotina separada no volume. | Banco e storage podem ter mecanismos gerenciados, ainda exigindo política, retenção e teste de restauração coordenada. |
| Recuperação | Mais trabalhosa: reconstruir host, PostgreSQL, aplicação e arquivos. | Mais simples: banco desacoplado; reconstruir aplicação e restaurar volume de documentos. | Potencialmente a mais simples após implementação correta, mas a consistência entre metadados e objetos continua responsabilidade da aplicação/operação. |
| Escalabilidade | Limitada ao host; aplicação, banco e documentos competem pelos mesmos recursos. | Boa para a primeira evolução: banco escala separadamente; aplicação e storage ainda compartilham limites. | Maior potencial de escala independente. |
| Risco operacional | Alto: falha única pode afetar aplicação, banco e documentos. | Médio: reduz o risco e a carga operacional do banco; volume de documentos ainda precisa de proteção. | Médio após maturidade; hoje é alto por incompatibilidade do adapter e maior número de integrações. |
| Adequação à primeira academia | Boa como alternativa de menor custo, desde que exista backup externo e disciplina operacional. | Melhor equilíbrio entre simplicidade, segurança, manutenção e crescimento. | Excessiva para a primeira versão e não compatível com o código atual sem alteração funcional. |

## 4. Componentes necessários

| Componente | Classificação | Motivo |
| --- | --- | --- |
| Frontend hosting | **OBRIGATÓRIO** | Serve o build estático e o SPA fallback. |
| Backend hosting | **OBRIGATÓRIO** | Executa API, regras de negócio e scheduler opcional. |
| PostgreSQL | **OBRIGATÓRIO** | Persistência operacional, financeira e de auditoria. |
| Document storage | **OBRIGATÓRIO** | A aplicação possui upload e download de documentos. |
| HTTPS | **OBRIGATÓRIO** | Protege autenticação, JWT, dados pessoais e documentos em trânsito. |
| Domínio | **OBRIGATÓRIO** | Oferece endereço estável e permite HTTPS de produção administrável. |
| DNS | **OBRIGATÓRIO** | Resolve o domínio para o ponto de entrada público. |
| Backup | **OBRIGATÓRIO** | Recuperação exige banco e documentos. |
| Monitoramento básico | **OBRIGATÓRIO** | Verifica processo, `GET /health`, erros e disponibilidade. |
| CDN | **OPCIONAL** | Não é necessária para a carga inicial conhecida. |
| Cache/Redis | **OPCIONAL** | `REDIS_URL` existe como configuração opcional, mas não há dependência runtime que exija Redis. |

Não são necessários neste estágio cluster, Kubernetes, service mesh, fila de mensagens, múltiplas regiões ou observabilidade enterprise.

## 5. Domínio e endpoints

O domínio final ainda não foi escolhido e nenhum DNS deve ser alterado nesta etapa.

Modelo conceitual possível:

- frontend: `https://app.wggrappling.com.br`;
- API por mesma origem: `https://app.wggrappling.com.br/api`, com reverse proxy removendo `/api` antes de encaminhar ao backend; ou
- API em origem separada: `https://api.wggrappling.com.br`, com `VITE_API_BASE_URL` apontando para essa URL e `CORS_ORIGIN=https://app.wggrappling.com.br`.

A mesma origem com `/api` simplifica CORS e reduz a quantidade de endpoints públicos. Os nomes são somente exemplos e não constituem escolha de domínio.

## 6. HTTPS

O HTTPS deve terminar no ponto de entrada público que serve o frontend e/ou encaminha a API. Pode ser terminado pelo serviço de hospedagem, load balancer, CDN ou reverse proxy. Como nenhum provedor foi escolhido, o mecanismo final é **não determinado**.

Requisitos independentes do mecanismo:

- aceitar somente HTTPS público;
- encaminhar `/api` para a porta interna do backend, removendo o prefixo porque a API não possui prefixo global; ou usar um subdomínio dedicado;
- manter a porta do NestJS fora da exposição pública direta;
- automatizar renovação do certificado no ambiente futuro.

## 7. Storage de documentos

### A — VPS com disco persistente

Compatível com o código atual. `DOCUMENT_STORAGE_PATH` deve apontar para um diretório persistente, fora do repositório e do diretório de build. O volume precisa sobreviver a releases e reinícios e ter backup externo.

### B — Servidor de aplicação com volume persistente

Compatível com o código atual se o volume for montado como filesystem no caminho configurado. A aplicação não pode ser movida para uma instância sem o mesmo volume. Em múltiplas instâncias, todas precisariam enxergar o mesmo filesystem consistente; essa topologia não foi implementada nem validada.

### C — Storage de objetos gerenciado

Não é compatível diretamente com a implementação atual. `StorageService` oferece abstração, mas somente `LocalStorageAdapter` está implementado e usa `node:fs`. Um storage de objetos exigirá novo adapter, configuração, testes de autorização, tratamento de erro e estratégia de migração; isso é alteração funcional futura e está fora deste bloco.

## 8. Backup e recuperação

### PostgreSQL

- Backup com `pg_dump` no formato custom por meio de `npm.cmd run db:backup`.
- Destino definido por `BACKUP_DIR`, persistente, protegido e fora do repositório e do servidor principal.
- Restauração com `pg_restore`, primeiro em banco novo e isolado, seguida de validação de dados, migrations, health check e login.
- Migrations não substituem backup; backup não substitui migrations.

### Documentos

- Backup separado de todo o conteúdo de `DOCUMENT_STORAGE_PATH`.
- Retenção e cópia externa protegida.
- Após restauração, validar a correspondência entre metadados PostgreSQL e arquivos.

### Comparação

A topologia C oferece potencialmente a recuperação de infraestrutura mais simples quando banco e objetos possuem mecanismos gerenciados, mas não é utilizável sem adaptação do código. Entre as opções compatíveis hoje, a topologia B oferece a recuperação mais simples: o PostgreSQL fica desacoplado e o único conjunto de arquivos administrado pela aplicação é o volume documental. Em todas as opções, a restauração completa continua exigindo coordenação entre banco e documentos.

## 9. Scheduler financeiro

- O processo backend deve permanecer ativo para registrar e disparar o cron.
- Implantar inicialmente com `FINANCIAL_CYCLE_ENABLED=false`.
- Após validar migrations, timezone, logs, idempotência e execução controlada, habilitar explicitamente.
- Frequência padrão: uma vez ao dia às 05:00 em `America/Sao_Paulo`.
- O advisory lock transacional no PostgreSQL impede duas execuções concorrentes de processarem o mesmo ciclo; uma execução sem lock retorna como ignorada.
- A geração também depende de restrições e lógica idempotente no banco/aplicação.
- Após restart, o job volta a ser registrado quando o módulo inicia, mas não recupera automaticamente horários perdidos.

## 10. E2E

- Estado: **PREPARADO/BLOQUEADO**.
- O smoke E2E autenticado está preparado no comando `npm.cmd run e2e:smoke`.
- Bloqueio: `SMOKE_TEST_PASSWORD` não pode ser fornecida pelo executor atual por canal seguro.
- Não tentar fallback, contorno ou inclusão da senha em código, `.env`, argumentos, documentação ou logs.
- E2E não deve ser executado nesta etapa.

## 11. Segurança

- Injetar `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, caminhos e demais configurações por mecanismo protegido; não armazenar secrets no Git ou em logs.
- Usar `JWT_SECRET` aleatório com no mínimo 32 caracteres.
- Expor somente HTTPS; manter backend e PostgreSQL em rede privada/restrita quando possível.
- Não expor `DOCUMENT_STORAGE_PATH` como diretório público; downloads devem passar pela autorização da aplicação.
- Definir `CORS_ORIGIN` com a origem HTTPS exata; `*` é proibido em produção pela validação.
- Proteger e criptografar backups conforme a capacidade do ambiente, mantendo cópia fora do servidor principal.
- Restringir permissões do banco, storage e processo ao mínimo necessário.
- Monitorar disponibilidade, erros e auditoria sem registrar tokens, secrets ou dados pessoais desnecessários.

## 12. Recomendação

### Arquitetura preferida: B — aplicação + PostgreSQL gerenciado

Motivo: oferece o melhor equilíbrio para a primeira academia. Remove a parte mais sensível e trabalhosa da operação do host da aplicação, reduz o domínio de falha, mantém compatibilidade com o storage atual por volume persistente e permite crescimento gradual sem exigir alteração funcional imediata.

- Principal vantagem: banco desacoplado, com manutenção e recuperação potencialmente mais simples, preservando uma aplicação operacionalmente pequena.
- Principal risco: os documentos continuam em volume administrado pela equipe e exigem backup separado, restauração coordenada e cuidado ao substituir ou escalar o backend.

### Arquitetura alternativa: A — tudo em uma VPS

Motivo: menor custo relativo e implantação conceitualmente simples para uma única academia, sem mudanças no código atual.

- Principal vantagem: poucos recursos para configurar e compatibilidade direta com PostgreSQL e filesystem locais.
- Principal risco: ponto único de falha e maior responsabilidade operacional; uma falha do host pode afetar simultaneamente frontend, backend, banco e documentos se backups externos não estiverem válidos.

### Arquitetura C

Deve ser reavaliada quando volume, disponibilidade ou escalabilidade justificarem a complexidade e depois que um adapter de storage de objetos estiver implementado e testado.

## 13. Decisões pendentes antes da contratação

- Fornecedor e região.
- Domínio final e modelo `/api` versus subdomínio.
- Mecanismo de terminação HTTPS.
- CPU, RAM e disco do backend após medição representativa.
- Capacidade, crescimento e retenção de PostgreSQL, documentos e backups.
- Limites de conexões e pool PostgreSQL.
- Retenção, frequência e objetivo de recuperação dos backups.
- Monitoramento básico e responsável por alertas.
- Momento aprovado para habilitar o scheduler.
