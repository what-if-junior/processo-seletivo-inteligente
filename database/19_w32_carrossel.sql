-- W32 — Carrossel: unique auto_edital row per edital (idempotent sync).
-- Base table: database/04_schema_extras.sql ("CarrosselItens").

CREATE UNIQUE INDEX IF NOT EXISTS "carrossel_itens_auto_edital_id_edital_uidx"
  ON "CarrosselItens" ("id_edital")
  WHERE "tipo" = 'auto_edital' AND "id_edital" IS NOT NULL;

COMMENT ON TABLE "CarrosselItens" IS
  'REQ-6.2 / RS09 Home carrossel. tipo=manual|auto_edital. Auto rows materialised when edital publicado+inscricoes_abertas (W32).';

COMMENT ON COLUMN "CarrosselItens"."auto_edital_habilitado" IS
  'Admin toggle for auto_edital cards. Public feed requires ativo AND auto_edital_habilitado. Sync never re-enables after admin disables.';
