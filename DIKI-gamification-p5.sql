-- =====================================================================
-- Diki-Diki — Fidélité « Les Échos » PHASE 5 : tirages (cadeaux)
-- =====================================================================
-- Additif, idempotent, RLS activée SANS policy (backend service_role seul).
-- A executer sur Supabase (schema public) AVANT de pousser le backend.
-- (Desactiver la traduction Chrome : mots-cles SQL en anglais.)
--
-- ⚠️ ARGENT REEL + volet juridique (loteries/jeux). Cadeaux MATERIELS uniquement,
--    JAMAIS du cash. Tirage « provably-fair » (graine_hash publie a la preparation,
--    graine revelee a l'execution -> selection recalculable par n'importe qui).
--    Un seul tirage par saison ; declenche manuellement par l'admin.
-- =====================================================================

-- 1) Reglages (defauts, inseres si absents) -----------------------------
insert into public.settings (key, value, description)
select 'fonds_split_local_pct', '60',
       'Fonds Cadeaux : part (%) affectee aux tirages LOCAUX de saison (Vitesse 1). Le reste va au GRAND pot (Vitesse 2). Defaut 60.'
where not exists (select 1 from public.settings where key = 'fonds_split_local_pct');

insert into public.settings (key, value, description)
select 'tirage_grand_statut_min', 'ambassadeur',
       'Grand tirage : statut minimum eligible (messager|porteparole|ambassadeur|heraut). Defaut ambassadeur.'
where not exists (select 1 from public.settings where key = 'tirage_grand_statut_min');

insert into public.settings (key, value, description)
select 'tirage_seuil_mode', 'prochain_lot',
       'Grand tirage : mode de seuil (prochain_lot|fixe|manuel). Defaut prochain_lot : dispo des que le pot couvre le prochain gros lot ; declenchement manuel.'
where not exists (select 1 from public.settings where key = 'tirage_seuil_mode');

insert into public.settings (key, value, description)
select 'tirage_seuil_fixe', '0',
       'Grand tirage : seuil fixe en F CFA (utilise seulement si tirage_seuil_mode=fixe).'
where not exists (select 1 from public.settings where key = 'tirage_seuil_fixe');

-- 2) Catalogue des cadeaux (12 listes mensuelles + grands lots) ----------
create table if not exists public.gift_catalog (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('local','grand')), -- local = tirage de saison ; grand = gros lot
  mois        int  check (mois between 1 and 12),              -- pour 'local' (liste mensuelle) ; null pour 'grand'
  libelle     text not null,
  valeur      bigint not null check (valeur >= 0),             -- valeur cible du lot (F CFA)
  statut_min  text,                                            -- eligibilite min specifique au lot (null = reglage global)
  actif       boolean not null default true,
  ordre       int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.gift_catalog enable row level security;

-- 3) Tirages (provably-fair : commit graine_hash -> reveal graine) -------
create table if not exists public.tirages (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('local','grand')),
  saison         text,                       -- ex '2026-S3'
  statut         text not null default 'prepare' check (statut in ('prepare','execute','annule')),
  graine         text,                       -- revelee a l'execution (secrete avant)
  graine_hash    text not null,              -- publie des la preparation (commit)
  pool_taille    int  not null default 0,
  pot_disponible bigint not null default 0,  -- pot du type au moment de la preparation
  pot_utilise    bigint not null default 0,  -- somme des valeurs des lots attribues
  nb_gagnants    int  not null default 0,
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  executed_at    timestamptz
);
alter table public.tirages enable row level security;

-- 4) Snapshot du pool eligible (audit + reproductibilite) ----------------
create table if not exists public.tirage_participants (
  id         uuid primary key default gen_random_uuid(),
  tirage_id  uuid not null references public.tirages(id),
  user_id    uuid not null,
  rang_tri   int  not null,                  -- ordre deterministe fige (par user_id)
  created_at timestamptz not null default now(),
  unique (tirage_id, user_id)
);
alter table public.tirage_participants enable row level security;

-- 5) Gagnants (cadeaux MATERIELS — JAMAIS du cash) -----------------------
create table if not exists public.tirage_gagnants (
  id            uuid primary key default gen_random_uuid(),
  tirage_id     uuid not null references public.tirages(id),
  user_id       uuid not null,
  catalog_id    uuid,
  lot_libelle   text not null,
  lot_valeur    bigint not null default 0,
  statut_remise text not null default 'a_remettre' check (statut_remise in ('a_remettre','remis','annule')),
  created_at    timestamptz not null default now()
);
alter table public.tirage_gagnants enable row level security;

notify pgrst, 'reload schema';
