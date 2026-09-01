# Project Guidelines

Monorepo for the "Processo Seletivo Inteligente" (IFB) system. NestJS backend, Next.js admin-web and candidate-app, Postgres. See `README.md` and `docs/architecture.md` for the full picture.

## Environment & Docker

- **`.env` is the single source of truth** for all runtime configuration. `docker-compose.yaml` loads it via `env_file: .env` for `postgres`, `backend`, and `pgadmin`; the frontends read `NEXT_PUBLIC_API_URL` / `BACKEND_SERVICE_URL` from it. Never hardcode IPs, ports, or secrets in source — put them in `.env` and mirror new keys in `.env.sample`.
- **JWT secrets must match.** `JWT_SECRET_TO_SIGN` (signs tokens, `auth.module.ts`) and `SECRET_OR_KEY` (validates tokens, `jwt.strategy.ts`) must be **identical** in `.env`. If they diverge, every authenticated request returns `401`. See `apps/backend/README.md`.
- **Local-build vs prod-pull split:**
  - Local dev: `docker compose up --build` builds images from the `Dockerfile` (targets `backend`, `admin-web`, `candidate-app`).
  - Production: `docker compose -f docker-compose.yaml -f docker-compose.prod.yaml pull && docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d` pulls pre-built GHCR images. `docker-compose.prod.yaml` uses `build: !reset null` to strip the `build:` section — do not attach build flags to GHCR images.

## Build & Test (Docker)

Use Docker for building and testing locally:

```bash
docker compose up --build          # build + run all services
docker compose up -d --build backend   # rebuild just the backend
docker compose down                 # stop
```

- Backend: `http://localhost:5005` · Admin: `http://localhost:3000` · Candidate PWA: `http://localhost:3001`
- Dev seed login: `admin@teste.com` / `admin123` (not `admin@ifb.edu.br`).
- After changing `.env`, restart the affected service: `docker compose up -d --build <service>`.