-- DIKI-gamification-p2.sql
-- Module Fidélité (« Les Échos ») — PHASE 2 : Statuts & badges. AUCUNE logique d'argent.
-- Additif. Le module reste INACTIF tant que gamification_settings.module_actif = false.
-- À exécuter dans le SQL Editor Supabase (schéma public), traduction Chrome DÉSACTIVÉE.

-- 1) Les 4 statuts (seed)
create table if not exists public.tiers (
  code text primary key,            -- 'messager' | 'porteparole' | 'ambassadeur' | 'heraut'
  nom text not null,
  ordre smallint not null,          -- 1..4
  defi_mensuel integer not null     -- 15 / 30 / 45 / 60
);
insert into public.tiers (code, nom, ordre, defi_mensuel) values
  ('messager',    'Le Messager',     1, 15),
  ('porteparole', 'Le Porte-parole', 2, 30),
  ('ambassadeur', 'L''Ambassadeur',  3, 45),
  ('heraut',      'Le Héraut',       4, 60)
on conflict (code) do nothing;

-- 2) Statut courant par votant (rempli au fil de l'activité ; progression en Phase 3)
create table if not exists public.user_tier_status (
  user_id uuid primary key,
  tier_code text not null default 'messager' references public.tiers(code),
  echos_mois integer not null default 0,
  echos_saison integer not null default 0,
  lettre text,                      -- 'C' | 'B' | 'A' (rempli en Phase 3)
  derniere_activite timestamptz,
  updated_at timestamptz not null default now()
);

-- 3) Badges : catalogue (seed) + badges obtenus
create table if not exists public.badges (
  code text primary key,
  nom text not null,
  critere text,
  icone text,
  actif boolean not null default true
);
insert into public.badges (code, nom, critere, icone) values
  ('panafricain', 'Panafricain',      'Soutenu des talents de 5 pays différents', '🌍'),
  ('decouvreur',  'Découvreur',       'Parmi les 10 premiers à soutenir un candidat qui finit sur le podium', '🔭'),
  ('batisseur',   'Bâtisseur',        'Parrainé 3 votants actifs', '🤝'),
  ('portevoix',   'Porte-voix',       'Généré 10 partages réellement ouverts', '📣'),
  ('fidele',      'Fidèle',           'Validé sa saison 4 trimestres d''affilée', '🎯'),
  ('explorateur', 'Explorateur',      'Voté dans ≥ 3 disciplines différentes', '🧭'),
  ('ascension',   'Ascension éclair', 'Atteint L''Ambassadeur dès la première année', '⚡')
on conflict (code) do nothing;

create table if not exists public.user_badges (
  user_id uuid not null,
  badge_code text not null references public.badges(code),
  obtenu_le timestamptz not null default now(),
  primary key (user_id, badge_code)
);

-- RLS activée SANS policy publique (seul le backend service_role y accède)
alter table public.tiers            enable row level security;
alter table public.user_tier_status enable row level security;
alter table public.badges           enable row level security;
alter table public.user_badges      enable row level security;

notify pgrst, 'reload schema';
