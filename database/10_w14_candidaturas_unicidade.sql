-- W14: align partial unique with REQ-2.2 (cancelada frees; reprovado/desclassificada block).
-- Safe on already-initialized volumes (03_auth.sql only runs on first init).

DROP INDEX IF EXISTS "candidaturas_usuario_edital_active_unique";
CREATE UNIQUE INDEX "candidaturas_usuario_edital_active_unique"
    ON "Candidaturas"("id_usuario", "id_edital")
    WHERE "status" <> 'cancelada';
