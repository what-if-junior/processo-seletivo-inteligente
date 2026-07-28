-- W15: unique inscrição protocol (REQ-2.5)
CREATE UNIQUE INDEX IF NOT EXISTS candidaturas_protocolo_unique
  ON "Candidaturas" ("protocolo")
  WHERE "protocolo" IS NOT NULL;
