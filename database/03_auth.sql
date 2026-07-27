-- Autenticacao e restricoes de integridade sobre o schema de 01_schemas.sql.
-- Executado depois de 01 e 02 (ordem alfabetica do docker-entrypoint-initdb.d).

ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "senha" VARCHAR(255);

-- Senhas de desenvolvimento: joao@teste.com = "senha123", admin@teste.com = "admin123".
UPDATE "Usuarios"
SET "senha" = '$2b$10$X5YUS8oDeL86X.epIWVVru3B.0E9Hf1T.YvJxbNyCbhZdNYgmbP7.'
WHERE "email" = 'joao@teste.com';

UPDATE "Usuarios"
SET "senha" = '$2b$10$HjmDf1.RAYPnVyCCZxxlO./Ju7Lc3NLnXhnQU/mmDAf0.P4IDhm4m'
WHERE "email" = 'admin@teste.com';

ALTER TABLE "Usuarios" ALTER COLUMN "senha" SET NOT NULL;

-- O candidato se inscreve antes de enviar documentos e foto (RS02 precede RS03).
ALTER TABLE "Usuarios" ALTER COLUMN "nome_RG" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "RG" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "nome_historico_escolar" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "historico_escolar" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "foto_alt" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "foto" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "renda_familiar" DROP NOT NULL;
ALTER TABLE "Usuarios" ALTER COLUMN "token" DROP NOT NULL;

ALTER TABLE "Usuarios" ALTER COLUMN "criado_em" SET DEFAULT NOW();
ALTER TABLE "Usuarios" ALTER COLUMN "atualizado_em" SET DEFAULT NOW();

-- Login por email exige unicidade.
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_email_unique" ON "Usuarios"("email");

-- RS02: uma unica inscricao ativa por usuario (CPF) e edital.
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_cpf_unique" ON "Usuarios"("CPF");
DROP INDEX IF EXISTS "candidaturas_usuario_curso_unique";
-- REQ-2.2: only `cancelada` frees the slot; reprovado/desclassificada still occupy it.
DROP INDEX IF EXISTS "candidaturas_usuario_edital_active_unique";
CREATE UNIQUE INDEX "candidaturas_usuario_edital_active_unique"
    ON "Candidaturas"("id_usuario", "id_edital")
    WHERE "status" <> 'cancelada';

-- Consultas de acompanhamento do candidato e dos paineis de gestao.
CREATE INDEX IF NOT EXISTS "candidaturas_id_usuario_idx" ON "Candidaturas"("id_usuario");
CREATE INDEX IF NOT EXISTS "candidaturas_id_oferta_idx" ON "Candidaturas"("id_oferta");
CREATE INDEX IF NOT EXISTS "candidaturas_id_edital_idx" ON "Candidaturas"("id_edital");
CREATE INDEX IF NOT EXISTS "documentos_id_candidatura_idx" ON "Documentos"("id_candidatura");
CREATE INDEX IF NOT EXISTS "etapas_processo_id_candidatura_idx" ON "Etapas Processo"("id_candidatura");
CREATE INDEX IF NOT EXISTS "recursos_id_etapa_processo_idx" ON "Recursos"("id_etapa_processo");
