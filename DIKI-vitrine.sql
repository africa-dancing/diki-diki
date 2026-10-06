-- =====================================================================
-- Diki-Diki — Vitrine publique des cadeaux (interrupteur)
-- =====================================================================
-- Ajoute le réglage `cadeaux_vitrine_active` (0 = cachée / mode aperçu,
-- 1 = visible par les utilisateurs). Défaut 0 : rien n'est exposé tant
-- que tu ne l'actives pas (verrou juridique §7.8). Idempotent.
-- A executer dans Supabase (schema public). (Desactiver la traduction Chrome.)
-- =====================================================================

insert into public.settings (key, value, description)
select 'cadeaux_vitrine_active', '0',
       'Vitrine publique des cadeaux : 1 = visible par les utilisateurs, 0 = cachee (mode apercu/desactive). Defaut 0 (verrou juridique).'
where not exists (select 1 from public.settings where key = 'cadeaux_vitrine_active');

notify pgrst, 'reload schema';
