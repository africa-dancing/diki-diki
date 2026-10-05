-- DIKI-gamification-p2b.sql
-- Fidélité « Les Échos » — vue de répartition des Échos par source (pour l'historique « d'où viennent mes Échos »).
-- Additif, lecture seule. AUCUNE logique d'argent.

create or replace view public.engagement_by_action as
  select user_id,
         action,
         sum(echos)::int as echos,
         count(*)::int   as n
  from public.engagement_ledger
  group by user_id, action;

notify pgrst, 'reload schema';
