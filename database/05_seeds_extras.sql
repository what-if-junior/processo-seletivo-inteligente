-- Empty-safe defaults for W2 extras (idempotent on fresh volume).
-- Faixas list intentionally empty → socioeconómico regra B until admin CRUD (W7).

TRUNCATE TABLE
    "ContestacaoHistorico",
    "TemplatesEdital",
    "TemplatesBiblioteca",
    "CarrosselItens",
    "NotificacaoLeituras",
    "PreferenciasNotificacao",
    "Notificacoes",
    "Contestacoes",
    "FaixasSalarioMinimo",
    "ConfiguracaoGlobal"
RESTART IDENTITY CASCADE;

INSERT INTO "ConfiguracaoGlobal"
("id", "salario_minimo_referencia", "atualizado_em")
VALUES
(1, 1518.00, NOW());

-- Preferencias rows are created on demand (W31); seed none.
-- Carrossel auto-edital rows are materialised when Editais exist (W1 + W32).
