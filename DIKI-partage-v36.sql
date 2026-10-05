-- =====================================================================
-- Diki-Diki — Partage V3.6 au moteur : Fonds Cadeaux + plafond des primes
-- =====================================================================
-- Additif, idempotent. NE MODIFIE AUCUNE colonne d'argent existante.
-- A executer sur Supabase (schema public) AVANT de pousser le backend.
-- (Desactiver la traduction Chrome : les mots-cles SQL doivent rester en anglais.)
--
-- Ce que ca pose :
--   1) Deux reglages (defauts V3.6) : Fonds Cadeaux 10 %, plafond primes 10 %.
--   2) Un grand livre « fonds_cadeaux_ledger » qui EARMARKE 10 % de chaque
--      cagnotte (1 ligne par challenge) — l'argent est mis de cote, trace,
--      jamais verse a un candidat. C'est la reserve des cadeaux/tirages.
--   3) Une vue de total pour piloter la reserve.
-- =====================================================================

-- 1) Reglages (inseres seulement s'ils n'existent pas deja) --------------
insert into public.settings (key, value, description)
select 'bracket_fonds_cadeaux_pct', '10',
       'Fonds Cadeaux : % de la cagnotte mis de cote (cadeaux/tirages des votants fideles). Defaut V3.6 = 10.'
where not exists (select 1 from public.settings where key = 'bracket_fonds_cadeaux_pct');

insert into public.settings (key, value, description)
select 'bracket_prime_plafond_pct', '10',
       'Plafond global des primes des elimines : % max de la cagnotte (V3.6 = min(20%xp, 10%)). Defaut = 10.'
where not exists (select 1 from public.settings where key = 'bracket_prime_plafond_pct');

-- 2) Grand livre du Fonds Cadeaux (earmark, append-only, 1 ligne/challenge)
create table if not exists public.fonds_cadeaux_ledger (
  id          uuid primary key default gen_random_uuid(),
  bracket_id  uuid not null unique,                 -- 1 seule contribution par challenge (idempotent)
  montant     bigint not null check (montant >= 0), -- 10 % de la cagnotte, mis de cote
  cagnotte    bigint not null check (cagnotte >= 0),-- cagnotte totale du challenge (tracabilite)
  statut      text   not null default 'reserve',    -- 'reserve' -> 'affecte' quand un tirage l'utilise (Phase 4/5)
  created_at  timestamptz not null default now()
);

alter table public.fonds_cadeaux_ledger enable row level security;

-- 3) Vue : reserve totale du Fonds Cadeaux disponible --------------------
create or replace view public.fonds_cadeaux_total as
  select coalesce(sum(montant), 0)::bigint as total_reserve,
         count(*)::int                     as nb_challenges
  from public.fonds_cadeaux_ledger
  where statut = 'reserve';

notify pgrst, 'reload schema';
