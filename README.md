# Processo Seletivo Inteligente

Monorepo Turborepo com NestJS (`apps/backend`), Next.js (`apps/web`) e schema Postgres em `database/`.

## Docker (db + backend + web)

```bash
cp .env.sample .env
docker compose up --build
```

| Serviço | URL |
| --- | --- |
| Web | http://localhost:3000 |
| Backend API | http://localhost:5005 |
| Swagger | http://localhost:5005/api |
| Postgres | localhost:5432 |
| pgAdmin | `docker compose --profile tools up` → http://localhost:5050 |

Seed logins (dev):

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`

Modelo ER e mapeamento SQL ↔ entities: [docs/er-model.md](docs/er-model.md).

> Scripts em `database/` só rodam em volume vazio. Após mudar SQL: `docker compose down -v`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Requer Postgres acessível com as variáveis de `.env` (`DATABASE_HOST=localhost` se o banco estiver no host).
