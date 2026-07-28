-- W18: menor de idade / responsável legal (REQ-2.4).
-- Age is computed at submit (data_inscricao); columns snapshot the gate result.
-- Safe on already-initialized volumes (01_schemas.sql only runs on first init).

ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "menor_idade" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "responsavel_nome" VARCHAR(255) NULL;
ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "responsavel_cpf" VARCHAR(14) NULL;
ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "responsavel_aceite" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "responsavel_documento_nome" VARCHAR(255) NULL;
ALTER TABLE "Candidaturas"
    ADD COLUMN IF NOT EXISTS "responsavel_documento" BYTEA NULL;
