-- =============================================================
-- Diki-Diki — Traçabilité des affiches générées (pont fidélité)
-- A executer dans Supabase (SQL editor), puis recharger le cache PostgREST.
-- AUCUNE logique d'argent : simple journal + rattachement challenge.
-- =============================================================

CREATE TABLE IF NOT EXISTS affiche_generations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  bracket_id    uuid,                                   -- challenge rattache (NULL si generique)
  bracket_code  varchar(40),                            -- snapshot du code challenge au moment de la generation
  titre         varchar(120),                           -- snapshot du titre saisi sur l'affiche
  discipline    varchar(80),                            -- snapshot de la discipline
  statut_lien   varchar(20) NOT NULL DEFAULT 'non_rattachee',  -- 'valide' | 'suspecte' | 'non_rattachee'
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiche_gen_user    ON affiche_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_affiche_gen_created ON affiche_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiche_gen_statut  ON affiche_generations(statut_lien);

-- IMPORTANT : recharger le cache de schema PostgREST (exactement en anglais).
NOTIFY pgrst, 'reload schema';
