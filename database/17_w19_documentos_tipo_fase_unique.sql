-- W19: prevent duplicate inscrição Documentos for the same tipo×fase (reuse/upload race).
CREATE UNIQUE INDEX IF NOT EXISTS "documentos_candidatura_tipo_fase_unique"
  ON "Documentos" ("id_candidatura", "tipo_documento", "fase");
