-- ============================================================
-- TABLE : sport_epreuves  (structure FINALE, 19 lignes)
-- Epreuves sportives editables (categorie "Sport" de /submit).
--
-- Colonnes de choix (liste deroulante generee cote /submit) :
--   choix_type = 'simple' -> kata 1..N          (Kata simple)
--   choix_type = 'plage'  -> 1a2, 1a3.. 1aN      (Enchainements)
--   choix_type = NULL     -> pas de deroulant    (foot/basket)
--   choix_max  = borne (10 pour les katas)
--
-- Le regroupement en bracket se fait sur sport_slug.
-- Les regles peuvent etre vides (a completer via l'admin).
--
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE (rejeu si redeploiement DB).
-- Idempotent : table creee si absente, INSERT protege (table vide).
-- ============================================================

-- ---- 1) Creation de la table ----
CREATE TABLE IF NOT EXISTS public.sport_epreuves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport       text        NOT NULL,          -- "Football", "Karate"...
  sport_slug  text        NOT NULL,          -- regroupement bracket : "football"
  epreuve     text        NOT NULL,          -- "Jonglages", "Kata simple", "Enchainements"...
  niveau      integer,                        -- foot/basket : palier ; katas : NULL
  libelle     text        NOT NULL,          -- affichage
  regle       text,                           -- regle complete (peut etre vide)
  emoji       text        DEFAULT '',
  ordre       integer     DEFAULT 0,
  actif       boolean     DEFAULT true,
  choix_type  text,                           -- 'simple' | 'plage' | NULL
  choix_max   integer,                        -- borne du deroulant (ex: 10)
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_epreuves_slug
  ON public.sport_epreuves (sport_slug);
CREATE INDEX IF NOT EXISTS idx_sport_epreuves_actif
  ON public.sport_epreuves (actif);

-- ---- 2) Insertion (garde-fou : uniquement si table vide) ----
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.sport_epreuves) = 0 THEN

    -- ===== FOOTBALL : Jonglages, 3 niveaux (choix_type NULL) =====
    INSERT INTO public.sport_epreuves (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre) VALUES
    ('Football','football','Jonglages',1,'Jonglages - Niveau 1',
     '3 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',10),
    ('Football','football','Jonglages',2,'Jonglages - Niveau 2',
     '5 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',11),
    ('Football','football','Jonglages',3,'Jonglages - Niveau 3',
     '10 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',12);

    -- ===== BASKET : Lancers francs (3 niveaux) + Dunks =====
    INSERT INTO public.sport_epreuves (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre) VALUES
    ('Basket','basket','Lancers francs',1,'Lancers francs - Niveau 1','5 lancers successifs enchaines sans faute.','🏀',20),
    ('Basket','basket','Lancers francs',2,'Lancers francs - Niveau 2','10 lancers successifs enchaines sans faute.','🏀',21),
    ('Basket','basket','Lancers francs',3,'Lancers francs - Niveau 3','20 lancers successifs enchaines sans faute.','🏀',22),
    ('Basket','basket','Dunks',NULL,'Dunks','Un enchainement de figures suivi d''un dunk final.','🏀',23);

    -- ===== ARTS MARTIAUX : 6 sports x 2 epreuves (Kata simple + Enchainements) =====
    -- choix_type simple/plage, choix_max 10, regle vide (a completer via admin)
    INSERT INTO public.sport_epreuves
      (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre, choix_type, choix_max)
    SELECT
      arts.sport, arts.slug, ep.nom, NULL,
      arts.sport || ' - ' || ep.nom, NULL, '🥋',
      arts.base_ordre + ep.rang, ep.ctype, 10
    FROM (VALUES
      ('Taekwondo','taekwondo', 30),
      ('Karate',   'karate',    50),
      ('Shotokan', 'shotokan',  70),
      ('Kung-fu',  'kungfu',    90),
      ('Taichi',   'taichi',   110),
      ('Wushu',    'wushu',    130)
    ) AS arts(sport, slug, base_ordre)
    CROSS JOIN (VALUES
      ('Kata simple',   'simple', 1),
      ('Enchaînements', 'plage',  2)
    ) AS ep(nom, ctype, rang);

    RAISE NOTICE 'Insertion terminee : % lignes',
      (SELECT COUNT(*) FROM public.sport_epreuves);
  ELSE
    RAISE NOTICE 'Table deja peuplee (% lignes) : aucune insertion.',
      (SELECT COUNT(*) FROM public.sport_epreuves);
  END IF;
END $$;
