# Processo Seletivo Inteligente

Monorepo npm workspaces com NestJS (`apps/backend`), painel admin Next.js (`apps/admin-web`), PWA de candidatos Next.js (`apps/candidate-app`) e schema Postgres em `database/`.

## Docker (db + backend + admin-web + candidate-app)

Há **dois fluxos** de deploy, controlados por variáveis de ambiente em `.env`
(que **não** é versionado — apenas `.env.sample` é commitado):

| Fluxo | Arquivo | Comportamento |
| --- | --- | --- |
| **Local** | `docker-compose.yaml` | Compila as imagens a partir do `Dockerfile` (`--build`) |
| **Servidor** | `docker-compose.yaml` + `docker-compose.prod.yaml` | Puxa imagens pré-construídas do GHCR (sem build) |

### Produção / operação de servidor (imagens pré-construídas)

No servidor, use o override `docker-compose.prod.yaml`, que remove a seção
`build:` e faz o compose **puxar as imagens publicadas pelo CI** do GHCR:

```bash
cp .env.sample .env
# Ajuste no .env: NEXT_PUBLIC_API_URL, WEB_ORIGIN, etc. (ver tabela abaixo)

# Puxa as imagens mais recentes do GHCR e reinicia os containers
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml pull
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d
```

### Build local (compilar a partir do Dockerfile)

O `docker-compose.yaml` possui seções `build:` apontando para o `Dockerfile`
multi-stage. `docker compose up --build` compila as imagens **localmente** a
partir do `Dockerfile`:

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
| `BACKEND_SERVICE_URL` | URL interna do backend na rede Docker (server-side/SSR; ex: `http://backend:5005`) |
| `NEXT_PUBLIC_API_URL` | URL pública do backend acessível pelo navegador; **inlinada no bundle em build** (ex: `http://localhost:5005` local |
| `REGISTRY` | prefixo das imagens GHCR (ex: `ghcr.io/what-if-junior/processo-seletivo-inteligente`) |
| `IMAGE_TAG` | tag das imagens pré-construídas (ex: `latest`) |
| `BACKEND_PORT` | porta pública do backend no host (5005) |

> **Importante:** `NEXT_PUBLIC_API_URL` é embutida no bundle do navegador
> **em tempo de build**. Por isso, no fluxo de servidor (imagens GHCR) o valor
> correto deve ser definido como **variável de repositório do GitHub Actions**
> (`vars.NEXT_PUBLIC_API_URL`) para o CI publicar a imagem com a URL certa.
> No build local, o valor vem do `build-arg` do `docker-compose.yaml`.

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
