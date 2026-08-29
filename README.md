# Processo Seletivo Inteligente

Monorepo npm workspaces com NestJS (`apps/backend`), painel admin Next.js (`apps/admin-web`), PWA de candidatos Next.js (`apps/candidate-app`) e schema Postgres em `database/`.

## Docker (db + backend + admin-web + candidate-app)

### Produção / operação de servidor (imagens pré-construídas)

Por padrão, `docker compose` **puxa as imagens pré-construídas do GHCR**
(GitHub Container Registry), publicadas pelo pipeline de CI/CD:

```bash
cp .env.sample .env

# Puxa as imagens mais recentes do GHCR e reinicia os containers
docker compose pull
docker compose up -d
```

### Build local (forçar compilação a partir do Dockerfile)

Use `--build` **apenas** se quiser forçar a compilação local dos containers a
partir do `Dockerfile`, em vez de puxar as imagens prontas do GHCR:

```bash
docker compose up --build
```

| Serviço | URL |
| --- | --- |
| Admin web | http://localhost:3000 |
| Candidate PWA | http://localhost:3001 |
| Backend API | http://localhost:5005 |
| Swagger | http://localhost:5005/api |
| Postgres | localhost:5432 |
| pgAdmin | `docker compose --profile tools up` → http://localhost:5050 |

Seed logins (dev):

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`

### Variáveis de ambiente (`.env`)

Copie `.env.sample` para `.env` e ajuste os valores conforme o ambiente:

| Variável | Uso |
| --- | --- |
| `DATABASE_HOST` | host do Postgres (`postgres` no Docker; `localhost` no host) |
| `DATABASE_PORT` | porta do Postgres (5432) |
| `DATABASE_USER` | usuário do banco |
| `DATABASE_PASS` | senha do banco |
| `DATABASE_NAME` | nome do banco |
| `PORT` | porta do backend (5005) |
| `JWT_SECRET_TO_SIGN` | segredo para assinar o JWT |
| `SECRET_OR_KEY` | segredo para validar o JWT (deve ser igual ao de assinatura) |
| `WEB_ORIGIN` | origens CORS permitidas (separadas por vírgula; ex: `http://localhost:3000,http://localhost:3001`) |

Documentação:

- [docs/architecture.md](docs/architecture.md) — arquitetura, API, Docker, verificação e requisitos
- [docs/er-model.md](docs/er-model.md) — diagrama ER e mapeamento SQL ↔ entities

> Scripts em `database/` só rodam em volume vazio. Após mudar SQL: `docker compose down -v`.

## Desenvolvimento local (npm workspaces)

Sem Docker, a partir da raiz do monorepo:

```bash
# instala dependências de todos os workspaces
npm install

# backend em modo watch (porta 5005)
npm run dev --workspace=backend

# admin-web (porta 3000)
npm run dev --workspace=admin-web

# candidate-app (porta 3001)
npm run dev --workspace=candidate-app
```

Candidate app tests:

```bash
npm run test -w candidate-app
```

Requer Postgres acessível com as variáveis de `.env` (`DATABASE_HOST=localhost` se o banco estiver no host).
