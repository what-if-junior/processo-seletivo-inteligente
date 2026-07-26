# Candidate PWA (RU02 / RS02)

Mobile-first Next.js app for candidate inscription, documents, and status tracking.

- Port: `3001`
- Stack: Next.js 15 (`output: "standalone"`), React 19, Tailwind 4
- UI: Figma import preserved (mocked data); shadcn kit kept under `src/components/ui` for later use

## Scripts

```bash
npm run dev -w candidate-app          # Turbopack on :3001
npm run build -w candidate-app        # required before start
npm run start -w candidate-app        # standalone server on :3001
npm run test -w candidate-app         # Vitest + RTL
```

`start` runs the Next standalone server (same shape as Docker), after copying `.next/static` and `public` into the standalone tree. Do not use `next start` with this app.

## Docker

1. Root `Dockerfile` includes `candidate-app-build` / `candidate-app` stages.
2. `docker-compose.yaml` service `candidate-app` on port `3001`.
3. Backend `WEB_ORIGIN` must include `http://localhost:3001`.
