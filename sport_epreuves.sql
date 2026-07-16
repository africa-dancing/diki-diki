-- ============================================================
-- TABLE : sport_epreuves
-- Epreuves sportives editables (categorie "Sport" de /submit).
-- Structure plate : 1 ligne = 1 choix final (sport + epreuve + niveau).
--
-- Le regroupement en bracket se fait sur sport_slug (ex: 'football').
-- La colonne 'regle' peut etre vide (katas) : a remplir depuis l'admin.
--
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE.
-- Idempotent : la table n'est creee que si absente ;
-- les INSERT sont proteges par un garde-fou (voir plus bas).
-- ============================================================

-- ---- 1) Creation de la table ----
CREATE TABLE IF NOT EXISTS public.sport_epreuves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport       text        NOT NULL,          -- affichage : "Football", "Karate"
  sport_slug  text        NOT NULL,          -- regroupement bracket : "football"
  epreuve     text        NOT NULL,          -- "Jonglages", "Katas", "Dunks"
  niveau      integer,                        -- 1,2,3... ou NULL si pas de palier
  libelle     text        NOT NULL,          -- ce qui s'affiche : "Jonglages - Niveau 1"
  regle       text,                           -- regle complete (peut etre vide)
  emoji       text        DEFAULT '',
  ordre       integer     DEFAULT 0,          -- ordre d'affichage
  actif       boolean     DEFAULT true,       -- masquer sans supprimer
  created_at  timestamptz DEFAULT now()
);

-- Index pour retrouver vite les epreuves d'un sport
CREATE INDEX IF NOT EXISTS idx_sport_epreuves_slug
  ON public.sport_epreuves (sport_slug);
CREATE INDEX IF NOT EXISTS idx_sport_epreuves_actif
  ON public.sport_epreuves (actif);

-- ---- 2) Insertion des epreuves ----
-- Garde-fou anti-doublon : on n'insere QUE si la table est vide.
-- Ainsi, relancer le script ne cree pas de doublons.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.sport_epreuves) = 0 THEN

    -- ===== FOOTBALL (emoji ballon) =====
    -- Epreuve : Jonglages par serie, 3 niveaux
    INSERT INTO public.sport_epreuves (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre) VALUES
    ('Football','football','Jonglages',1,'Jonglages - Niveau 1',
     '3 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',10),
    ('Football','football','Jonglages',2,'Jonglages - Niveau 2',
     '5 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',11),
    ('Football','football','Jonglages',3,'Jonglages - Niveau 3',
     '10 fois 3 series de jonglages avec une relance entre chaque serie + un enchainement de renvoi dans le but.','⚽',12);

    -- ===== BASKET =====
    -- Epreuve 1 : Lancers francs, 3 niveaux
    INSERT INTO public.sport_epreuves (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre) VALUES
    ('Basket','basket','Lancers francs',1,'Lancers francs - Niveau 1',
     '5 lancers successifs enchaines sans faute.','🏀',20),
    ('Basket','basket','Lancers francs',2,'Lancers francs - Niveau 2',
     '10 lancers successifs enchaines sans faute.','🏀',21),
    ('Basket','basket','Lancers francs',3,'Lancers francs - Niveau 3',
     '20 lancers successifs enchaines sans faute.','🏀',22),
    -- Epreuve 2 : Dunks, sans niveau
    ('Basket','basket','Dunks',NULL,'Dunks',
     'Un enchainement de figures suivi d''un dunk final.','🏀',23);

    -- ===== ARTS MARTIAUX : Katas, 10 niveaux chacun, regle VIDE =====
    -- Regles a completer depuis l'admin. Libelle suffit pour le flux.
    INSERT INTO public.sport_epreuves (sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre)
    SELECT
      arts.sport,
      arts.slug,
      'Katas',
      lvl.n,
      'Katas - Niveau ' || lvl.n,
      NULL,                                   -- regle vide
      '🥋',
      arts.base_ordre + lvl.n
    FROM (VALUES
      ('Taekwondo','taekwondo', 30),
      ('Karate',   'karate',    50),
      ('Shotokan', 'shotokan',  70),
      ('Kung-fu',  'kungfu',    90),
      ('Taichi',   'taichi',   110),
      ('Wushu',    'wushu',    130)
    ) AS arts(sport, slug, base_ordre)
    CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10)) AS lvl(n);

    RAISE NOTICE 'Insertion terminee : % lignes',
      (SELECT COUNT(*) FROM public.sport_epreuves);
  ELSE
    RAISE NOTICE 'Table deja peuplee (% lignes) : aucune insertion.',
      (SELECT COUNT(*) FROM public.sport_epreuves);
  END IF;
END $$;
