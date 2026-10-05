-- =====================================================================
-- Diki-Diki — Phase 5b : tirage simultané multi-statuts + lettres C/B/A
-- =====================================================================
-- Additif, idempotent.
--  * gift_catalog.lettre  : range chaque cadeau par mois de saison (C/B/A).
--  * tirage_participants.statut / tirage_gagnants.statut : audit par statut.
--  * tirages.lettre        : mode du tirage (null = saison entiere ; C/B/A = par lettre).
-- A executer dans Supabase (schema public) AVANT de pousser le backend.
-- (Desactiver la traduction Chrome.)
-- =====================================================================

alter table public.gift_catalog         add column if not exists lettre text;  -- 'C' | 'B' | 'A' | null
alter table public.tirage_participants  add column if not exists statut text;
alter table public.tirage_gagnants      add column if not exists statut text;
alter table public.tirages              add column if not exists lettre text;  -- null = saison (3 lettres) ; sinon C/B/A

notify pgrst, 'reload schema';
