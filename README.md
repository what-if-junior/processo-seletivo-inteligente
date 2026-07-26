# Processo Seletivo Inteligente

Monorepo npm workspaces com NestJS (`apps/backend`), painel admin Next.js (`apps/admin-web`), PWA de candidatos Next.js (`apps/candidate-app`) e schema Postgres em `database/`.

## Docker (db + backend + admin-web + candidate-app)

```bash
cp .env.sample .env
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

Documentação:

- [docs/architecture.md](docs/architecture.md) — arquitetura, API, Docker, verificação e requisitos
- [docs/er-model.md](docs/er-model.md) — diagrama ER e mapeamento SQL ↔ entities

> Scripts em `database/` só rodam em volume vazio. Após mudar SQL: `docker compose down -v`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Candidate app tests:

```bash
npm run test -w candidate-app
```

Requer Postgres acessível com as variáveis de `.env` (`DATABASE_HOST=localhost` se o banco estiver no host).
