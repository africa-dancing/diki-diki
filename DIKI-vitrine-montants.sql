-- =====================================================================
-- Diki-Diki — Vitrine : interrupteur d'affichage des montants
-- =====================================================================
-- Ajoute `cadeaux_vitrine_montants` (0 = montants cachés, 1 = affichés).
-- Défaut 0 : la liste s'affiche sans montants tant que tu ne l'allumes pas.
-- Idempotent. A executer dans Supabase. (Desactiver la traduction Chrome.)
-- =====================================================================

insert into public.settings (key, value, description)
select 'cadeaux_vitrine_montants', '0',
       'Vitrine publique : 1 = afficher les montants des cadeaux, 0 = les cacher. Defaut 0.'
where not exists (select 1 from public.settings where key = 'cadeaux_vitrine_montants');

notify pgrst, 'reload schema';
