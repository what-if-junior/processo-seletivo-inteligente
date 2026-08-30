# Backend API (`apps/backend`)

API NestJS + TypeORM do Processo Seletivo Inteligente. Expõe Swagger em `/api` e
persiste no Postgres usando o schema SQL de `database/` como fonte da verdade
(`synchronize: false`).

## Docker (recomendado)

O backend é um dos targets do `Dockerfile` multi-stage do monorepo
(`target: backend`) e roda como serviço `backend` no `docker-compose.yaml`.

A partir da raiz do monorepo:

```bash
# 1. Crie o .env a partir do modelo já versionado no projeto
cp .env.sample .env

# 2. Suba o stack (postgres + backend + admin-web + candidate-app)
docker compose up --build
```

- Backend API: http://localhost:5005
- Swagger: http://localhost:5005/api
- Postgres: localhost:5432

> `docker compose up --build` compila as imagens localmente a partir do
> `Dockerfile`. Para usar as imagens pré-construídas do GHCR no servidor, use o
> override `docker-compose.prod.yaml`:
> `docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d`
> (veja o `README.md` raiz).

### Variáveis de ambiente

O backend lê as seguintes variáveis (todas já presentes em `.env.sample`):

| Variável | Uso |
| --- | --- |
| `DATABASE_HOST` | host do Postgres (`postgres` no Docker; `localhost` no host) |
| `DATABASE_PORT` | porta do Postgres (5432) |
| `DATABASE_USER` | usuário do banco |
| `DATABASE_PASS` | senha do banco |
| `DATABASE_NAME` | nome do banco |
| `PORT` | porta do Nest (5005) |
| `JWT_SECRET_TO_SIGN` | segredo para assinar o JWT |
| `SECRET_OR_KEY` | segredo para validar o JWT (deve ser igual ao de assinatura) |
| `WEB_ORIGIN` | origens CORS permitidas (separadas por vírgula; ex: `http://localhost:3000,http://localhost:3001`) |

## Desenvolvimento local (npm workspaces)

Sem Docker, a partir da raiz do monorepo:

```bash
# instala dependências de todos os workspaces
npm install

# backend em modo watch (porta 5005)
npm run start:dev --workspace=backend

# build de produção
npm run build --workspace=backend

# testes
npm run test --workspace=backend
```

Requer Postgres acessível com as variáveis de `.env`
(`DATABASE_HOST=localhost` se o banco estiver no host).

## Swagger

- UI interativa em `GET /api` (rota pública).
- Todos os controllers são anotados com `@ApiTags` / `@ApiOperation`.
- Botão **Authorize** para autenticar com `Authorization: Bearer <access_token>`.
- Exemplos de uso no Next.js disponíveis na própria UI do Swagger.

## Seeds de desenvolvimento

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`
