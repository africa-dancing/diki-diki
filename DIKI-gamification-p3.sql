-- DIKI-gamification-p3.sql — PHASE 3 : saisons, lettres C→B→A, montée/régression, classement, badges.
-- Additif. AUCUNE logique d'argent (reconnaissance uniquement). Le module reste gated par module_actif.

-- État de bascule (rollover) par votant, ajouté à user_tier_status.
alter table public.user_tier_status
  add column if not exists last_season_processed text,
  add column if not exists saisons_validees_consecutives integer not null default 0;

notify pgrst, 'reload schema';
