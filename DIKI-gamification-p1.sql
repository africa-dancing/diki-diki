-- DIKI-gamification-p1.sql
-- Module Fidélité (« Les Échos ») — PHASE 1 : Fondations. AUCUNE logique d'argent.
-- Interrupteur maître INACTIF par défaut (module_actif=false) : une fois déployé,
-- ZÉRO effet en prod tant que tu ne l'actives pas dans Admin -> Fidélité (Échos).
-- À exécuter dans le SQL Editor Supabase (schéma public), traduction Chrome DÉSACTIVÉE.

-- 1) Réglages Gamification = source de vérité (ligne unique id=1)
create table if not exists public.gamification_settings (
  id smallint primary key default 1,
  module_actif boolean not null default false,
  echo_par_vote integer not null default 1,
  echo_parrainage integer not null default 3,
  echo_partage integer not null default 2,
  echo_commentaire integer not null default 1,
  plafond_coup_pouce_pct integer not null default 20,
  fuseau text not null default 'WAT',
  updated_at timestamptz not null default now(),
  constraint gamification_settings_singleton check (id = 1)
);
insert into public.gamification_settings (id) values (1) on conflict (id) do nothing;

-- 2) Journal immuable des Échos (append-only ; echos peut être négatif = contrepassation)
create table if not exists public.engagement_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,     -- 'vote' | 'parrainage' | 'partage' | 'commentaire' | 'contrepassation' ...
  echos integer not null,
  ref text,
  saison text,              -- rempli en Phase 3
  mois text,                -- 'YYYY-MM' (fuseau WAT), rempli en Phase 3
  created_at timestamptz not null default now()
);
create index if not exists idx_engagement_ledger_user    on public.engagement_ledger (user_id);
create index if not exists idx_engagement_ledger_created  on public.engagement_ledger (created_at);

-- RLS activée SANS policy publique -> seul le backend (service_role) y accède (comme messages/annonces)
alter table public.engagement_ledger    enable row level security;
alter table public.gamification_settings enable row level security;

-- 3) Solde courant d'Échos par utilisateur (vue simple)
create or replace view public.engagement_balance as
  select user_id, coalesce(sum(echos), 0)::bigint as echos
  from public.engagement_ledger
  group by user_id;

notify pgrst, 'reload schema';
