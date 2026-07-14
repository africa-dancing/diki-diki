-- ============================================================================
-- DIKI-DIKI — INVENTAIRE COMPLET DES COLONNES (schéma public)
-- Généré le 07/07/2026 — à conserver comme référence pré-prod
-- Complète diki_diki_fonctions_rpc.sql (RPC, triggers, contraintes CHECK)
--
-- Objectif : documenter TOUTES les colonnes des tables ayant reçu des
-- modifications manuelles (non versionnées dans Git), pour pouvoir
-- reconstituer/rejouer le schéma exact sur la base de production.
--
-- Légende :
--   [CONFIRMÉ]  = déjà connu / documenté avant cette session
--   [NOUVEAU]   = découvert lors de l'inventaire du 07/07/2026, à vérifier
--                 côté code (usage réel, branché ou non)
-- ============================================================================


-- ============================================================================
-- TABLE: brackets
-- ============================================================================
-- id                uuid                        NOT NULL  gen_random_uuid()
-- track_id          uuid                        NULL      NULL              [CONFIRMÉ] bridge Parcours/Improvisation
-- title             text                        NOT NULL  NULL
-- discipline        text                        NULL      NULL
-- type              text                        NULL      'elimination'::text
-- max_participants  integer                     NULL      16
-- status            text                        NULL      'open'::text
-- current_round     integer                     NULL      0
-- total_cagnotte    integer                     NULL      0
-- commission_pct    numeric                     NULL      0.5
-- winner_id         uuid                        NULL      NULL
-- started_at        timestamp with time zone    NULL      NULL
-- ended_at          timestamp with time zone    NULL      NULL
-- created_at        timestamp with time zone    NULL      now()
-- updated_at        timestamp with time zone    NULL      now()
-- categorie         text                        NULL      NULL              [NOUVEAU] usage à clarifier (vs. discipline ?)
-- style             text                        NULL      NULL              [NOUVEAU] usage à clarifier
-- code              text                        NULL      NULL              [NOUVEAU] usage à clarifier (code court ?)
-- second_id         uuid                        NULL      NULL              [NOUVEAU] gagnant 2e place — lié à distribution 60/25/15
-- third_id          uuid                        NULL      NULL              [NOUVEAU] gagnant 3e place — lié à distribution 60/25/15
-- mode              text                        NULL      'normal'::text    [CONFIRMÉ] toggle Normal/Improvisation


-- ============================================================================
-- TABLE: bracket_participants
-- ============================================================================
-- id             uuid                        NOT NULL  gen_random_uuid()
-- bracket_id     uuid                        NULL      NULL
-- user_id        uuid                        NOT NULL  NULL
-- video_id       uuid                        NULL      NULL
-- track_choice   text                        NULL      NULL              [NOUVEAU] probable choix de piste en mode Improvisation
-- registered_at  timestamp with time zone    NULL      now()
-- score          integer                     NOT NULL  0
-- eliminated_at  timestamp with time zone    NULL      NULL
-- stars_count    integer                     NOT NULL  0                 [CONFIRMÉ] pool de vote (watch page)
-- hearts_count   integer                     NOT NULL  0                 [CONFIRMÉ] pool de vote (watch page)
-- final_path     text                        NULL      NULL              [CONFIRMÉ] Match Bronze C16 (bronze/finale routing)


-- ============================================================================
-- TABLE: bracket_participant_videos
-- ============================================================================
-- id              uuid                        NOT NULL  gen_random_uuid()
-- participant_id  uuid                        NOT NULL  NULL
-- round_number    integer                     NOT NULL  NULL
-- video_id        uuid                        NOT NULL  NULL
-- created_at      timestamp with time zone    NOT NULL  now()
-- -- [CONFIRMÉ] table du modèle "une vidéo par étape" (Option A) — 5-types challenge engine


-- ============================================================================
-- TABLE: videos
-- ============================================================================
-- id               uuid                        NOT NULL  uuid_generate_v4()
-- user_id          uuid                        NOT NULL  NULL
-- discipline       USER-DEFINED (enum)         NOT NULL  NULL              [NOUVEAU] type enum Postgres, pas text — attention si régénération TS
-- track_title      character varying           NULL      NULL
-- track_artist     character varying           NULL      NULL
-- track_genre      character varying           NULL      NULL
-- storage_path     text                        NOT NULL  NULL
-- storage_url      text                        NULL      NULL
-- file_size_mb     numeric                     NULL      NULL
-- duration_sec     integer                     NULL      NULL
-- resolution       character varying           NULL      NULL
-- format           character varying           NULL      NULL
-- thumbnail_url    text                        NULL      NULL
-- status           USER-DEFINED (video_status) NULL      'pending'::video_status  [NOUVEAU] type enum Postgres explicite
-- reviewed_by      uuid                        NULL      NULL
-- reviewed_at      timestamp with time zone    NULL      NULL
-- rejection_reason text                        NULL      NULL
-- title            character varying           NULL      NULL
-- description      text                        NULL      NULL
-- views            integer                     NULL      0
-- created_at       timestamp with time zone    NULL      now()
-- updated_at       timestamp with time zone    NULL      now()
-- challenge_type   character varying           NULL      'C16'::character varying  [CONFIRMÉ] lié à videos_challenge_type_check


-- ============================================================================
-- TABLE: musiques (médiathèque)
-- ============================================================================
-- id            uuid                        NOT NULL  gen_random_uuid()
-- artiste       text                        NOT NULL  NULL
-- album         text                        NULL      NULL
-- titre         text                        NOT NULL  NULL
-- duree_sec     integer                     NULL      NULL
-- pays_origine  text                        NULL      NULL
-- continent     text                        NULL      NULL
-- danse         text                        NULL      NULL
-- style         text                        NULL      NULL
-- cover_url     text                        NULL      NULL
-- source        text                        NOT NULL  'manuel'::text     [CONFIRMÉ] élargi à 'admin' via musiques_source_check
-- submitted_by  uuid                        NULL      NULL
-- status        text                        NOT NULL  'pending'::text
-- created_at    timestamp with time zone    NOT NULL  now()


-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- id              uuid                        NOT NULL  NULL
-- username        text                        NOT NULL  NULL
-- avatar_url      text                        NULL      NULL
-- bio             text                        NULL      NULL
-- country         text                        NULL      NULL
-- is_verified     boolean                     NULL      false             [CONFIRMÉ] condition challenge creation
-- is_public       boolean                     NULL      true
-- total_likes     integer                     NULL      0
-- total_videos    integer                     NULL      0
-- followers_count integer                     NULL      0
-- created_at      timestamp with time zone    NULL      now()
-- updated_at      timestamp with time zone    NULL      now()             [CONFIRMÉ] trigger profiles_updated_at


-- ============================================================================
-- TABLE: transactions
-- ============================================================================
-- id          uuid                        NOT NULL  uuid_generate_v4()
-- user_id     uuid                        NOT NULL  NULL
-- type        character varying           NOT NULL  NULL              [CONFIRMÉ] CHECK: credit/vote/payout/refund/bracket_win/soutenir
-- operator    character varying           NULL      NULL              Mobile Money: Orange/Wave/MTN/Moov/Celtiis
-- phone       character varying           NULL      NULL
-- amount      integer                     NOT NULL  NULL
-- net_amount  integer                     NOT NULL  NULL              [CONFIRMÉ] NOT NULL — fix historique
-- fee         integer                     NULL      0
-- ref         character varying           NULL      NULL
-- status      character varying           NULL      'pending'::character varying   [CONFIRMÉ] CHECK: pending/success/failed
-- metadata    jsonb                       NULL      NULL
-- created_at  timestamp with time zone    NULL      now()


-- ============================================================================
-- TABLE: wallets
-- ============================================================================
-- id              uuid                        NOT NULL  uuid_generate_v4()
-- user_id         uuid                        NOT NULL  NULL
-- balance         integer                     NULL      0                 [CONFIRMÉ] 1 unité = 100F, non-withdrawable
-- total_credited  integer                     NULL      0                 [CONFIRMÉ] cumul lifetime — condition challenge creation ≥1000F
-- total_spent     integer                     NULL      0                 [NOUVEAU] miroir de total_credited — vérifier si incrémenté côté backend
-- updated_at      timestamp with time zone    NULL      now()
-- -- Note : PAS de colonne created_at sur cette table


-- ============================================================================
-- RÉCAPITULATIF — NOUVEAUTÉS DÉCOUVERTES LE 07/07/2026 (à investiguer)
-- ============================================================================
-- brackets.second_id, brackets.third_id   → à croiser avec distributeCagnotte (60/25/15)
-- brackets.code, brackets.categorie, brackets.style → usage à confirmer (code mort ou actif ?)
-- bracket_participants.track_choice       → lien mode Improvisation
-- videos.discipline / videos.status       → types enum Postgres (USER-DEFINED), pas text
-- wallets.total_spent                     → vérifier si incrémenté par le backend

-- ============================================================================
-- FIN DE L'INVENTAIRE COLONNES — 8 tables couvertes à 100%
-- (brackets, bracket_participants, bracket_participant_videos, videos,
--  musiques, profiles, transactions, wallets)
-- ============================================================================
