-- =====================================================================
-- Diki-Diki — Espace d'échanges : préférence de nom affiché (annuaire + mur)
-- 'pseudo' = nom de scène (username) · 'nom' = vrai nom (name). À exécuter dans Supabase.
-- =====================================================================
alter table public.users add column if not exists nom_public text not null default 'pseudo';
notify pgrst, 'reload schema';
