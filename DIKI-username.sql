-- DIKI-username.sql — Pseudo unique (@handle) par utilisateur. Additif & reversible.
-- A EXECUTER dans le SQL Editor Supabase (schema public).
-- ⚠️ Chrome traduit la page : garder les mots-cles SQL EN ANGLAIS (surtout NOTIFY).

-- 1) Colonne username (null autorise : tout le monde n'en a pas encore)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(20);

-- 2) Unicite INSENSIBLE A LA CASSE (bella = Bella), uniquement sur les valeurs non nulles
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON users (lower(username)) WHERE username IS NOT NULL;

-- 3) Recharger le cache PostgREST (mots-cles EN ANGLAIS exactement)
NOTIFY pgrst, 'reload schema';
