-- =====================================================================
-- DIKI-DIKI — EXPORT DE LA CONFIGURATION (lecture seule, sans secret)
-- =====================================================================
-- BUT : sortir en UN seul bloc JSON toute la config « éparpillée » de la
--       plateforme (taxonomie, formats, objectifs, réglages), pour que
--       Claude puisse enfin la lire.
--
-- COMMENT FAIRE (3 étapes) :
--   1. Ouvre Supabase -> ton projet -> onglet « SQL Editor » -> New query.
--   2. Colle TOUT ce fichier, clique « Run ».
--   3. Dans le résultat, une seule cellule « config » apparaît : clique
--      dessus, copie son contenu, et colle-le dans un nouveau fichier
--      texte nommé  config_base.json  que tu enregistres dans le dossier
--      Diki-Diki (le dossier connecté). Dis-le moi et je le lis.
--
-- Cette requête ne fait que LIRE. Elle ne contient aucun mot de passe ni
-- clé : uniquement des tables de configuration.
-- =====================================================================

select json_build_object(
  'categories',        (select coalesce(json_agg(t), '[]'::json) from public.categories        t),
  'disciplines',       (select coalesce(json_agg(t), '[]'::json) from public.disciplines       t),
  'discipline_champs', (select coalesce(json_agg(t), '[]'::json) from public.discipline_champs t),
  'discipline_choix',  (select coalesce(json_agg(t), '[]'::json) from public.discipline_choix  t),
  'challenge_formats', (select coalesce(json_agg(t), '[]'::json) from public.challenge_formats t),
  'bloc_objectifs',    (select coalesce(json_agg(t), '[]'::json) from public.bloc_objectifs    t),
  'settings',          (select coalesce(json_agg(t), '[]'::json) from public.settings          t)
) as config;

-- Si une table renvoie une erreur « relation does not exist », supprime
-- simplement sa ligne et relance : je m'occuperai du reste.
