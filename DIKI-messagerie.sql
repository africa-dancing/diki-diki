-- DIKI-messagerie.sql — Messagerie interne texte (V1). Additif & reversible.
-- A EXECUTER dans le SQL Editor Supabase (schema public).
-- ⚠️ Chrome traduit la page : garder les mots-cles SQL EN ANGLAIS (surtout la
-- derniere ligne NOTIFY) et desactiver la traduction avant de coller.

-- 1) Messages
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz,
  flagged         boolean NOT NULL DEFAULT false,   -- detection auto (contournement)
  flag_reason     text,
  reported        boolean NOT NULL DEFAULT false,   -- signalement par un utilisateur
  reported_reason text,
  reporter_id     uuid
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread    ON messages(recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_mod       ON messages(created_at DESC) WHERE flagged OR reported;

-- 2) Blocages
CREATE TABLE IF NOT EXISTS message_blocks (
  blocker_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- 3) Reglage utilisateur : autoriser la reception de messages (defaut oui)
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_enabled boolean NOT NULL DEFAULT true;

-- 4) Securite : RLS activee SANS policy publique (comme la table annonces).
--    Le backend utilise la cle service_role qui contourne la RLS ; personne
--    d'autre ne peut lire/ecrire ces tables via l'API REST publique.
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_blocks ENABLE ROW LEVEL SECURITY;

-- 5) Recharger le cache PostgREST (mots-cles EN ANGLAIS exactement)
NOTIFY pgrst, 'reload schema';
