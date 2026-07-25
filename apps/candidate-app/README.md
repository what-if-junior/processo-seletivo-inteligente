# Candidate PWA (RU02 / RS02)

Reserved for the candidate Progressive Web App.

- Port (planned): `3001`
- Figma design/app import pending
- Will join npm workspaces and Docker Compose after the import lands

## Wiring into Docker (after import)

1. Add `apps/candidate-app/package.json` (workspace name `candidate-app`) with `output: "standalone"` in Next config.
2. In root `Dockerfile`:
   - uncomment `COPY apps/candidate-app/package.json` in the `deps` stage
   - uncomment `candidate-app-build` and `candidate-app` stages
3. In `docker-compose.yaml`, uncomment the `candidate-app` service (`target: candidate-app`, port `3001`).
4. Extend `WEB_ORIGIN` with `http://localhost:3001` (comma-separated).

The shared `deps` / `types-build` stages are reused — no third full monorepo install.
