-- =====================================================================
-- Diki-Diki — Espace d'échanges : Mur d'entraide (annonces) + Annuaire
-- À exécuter dans Supabase (schéma public). Idempotent.
-- =====================================================================
create extension if not exists pgcrypto;

create table if not exists public.echanges_posts (
  id              uuid primary key default gen_random_uuid(),
  auteur_id       uuid not null references public.users(id) on delete cascade,
  discipline      text,
  type            text not null default 'solo',   -- 'solo' | 'groupe'
  message         text not null,
  statut          text not null default 'ouvert', -- 'ouvert' | 'ferme'
  reported        boolean not null default false,
  reported_reason text,
  flagged         boolean not null default false, -- auto-détection hors plateforme
  flagged_reason  text,
  created_at      timestamptz not null default now()
);
create index if not exists ix_echanges_statut_date on public.echanges_posts(statut, created_at desc);
create index if not exists ix_echanges_auteur on public.echanges_posts(auteur_id);

-- Réglage « M'afficher dans l'annuaire » (visible par défaut)
alter table public.users add column if not exists annuaire_visible boolean not null default true;

-- Recharge le cache de l'API
notify pgrst, 'reload schema';
