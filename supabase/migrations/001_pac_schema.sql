-- ============================================================
-- Diki-Diki — Schéma PostgreSQL v2.0
-- Migration: 001_pac_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM : Disciplines (6)
-- ============================================================
CREATE TYPE discipline_type AS ENUM (
  'danse', 'chant', 'instrument', 'acapella', 'humour', 'poesie'
);

-- ============================================================
-- ENUM : Type de compétition
-- ============================================================
CREATE TYPE competition_type AS ENUM ('duo', 'groupe');

-- ============================================================
-- ENUM : Statut vidéo (modération)
-- ============================================================
CREATE TYPE video_status AS ENUM (
  'pending', 'approved', 'rejected', 'processing'
);

-- ============================================================
-- ENUM : Statut compétition
-- ============================================================
CREATE TYPE contest_status AS ENUM (
  'draft', 'open', 'active', 'pause', 'closed', 'ended'
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         VARCHAR(20)  UNIQUE NOT NULL,
  country_code  VARCHAR(5)   NOT NULL,
  country_name  VARCHAR(80)  NOT NULL,
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL,
  stage_name    VARCHAR(80),                    -- Nom de scène optionnel
  discipline    discipline_type,                -- Discipline principale
  avatar_url    TEXT,
  role          VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user','admin','moderator')),
  status        VARCHAR(20)  DEFAULT 'actif' CHECK (status IN ('actif','suspend','banned')),
  lang          VARCHAR(10)  DEFAULT 'fr',
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- TABLE: wallets
-- ============================================================
CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance         INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_credited  INTEGER DEFAULT 0,
  total_spent     INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABLE: videos  ← NOUVEAU
-- Chaque candidat dépose UNE vidéo de prestation
-- ============================================================
CREATE TABLE videos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Discipline et morceau
  discipline      discipline_type NOT NULL,
  track_title     VARCHAR(150),               -- Titre du morceau
  track_artist    VARCHAR(100),               -- Artiste de référence
  track_genre     VARCHAR(60),                -- Genre musical
  -- Fichier vidéo (Supabase Storage)
  storage_path    TEXT NOT NULL,              -- Chemin dans le bucket
  storage_url     TEXT,                       -- URL publique signée
  file_size_mb    DECIMAL(6,2),
  duration_sec    INTEGER,                    -- Durée en secondes (max 180)
  resolution      VARCHAR(20),                -- Ex: 1920x1080
  format          VARCHAR(10),                -- mp4, mov
  thumbnail_url   TEXT,                       -- Miniature auto-générée
  -- Modération
  status          video_status DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id),  -- Modérateur
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,                      -- Motif si rejeté
  -- Métadonnées
  title           VARCHAR(120),               -- Titre de la vidéo (optionnel)
  description     TEXT,
  views           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: contests  ← MIS À JOUR
-- ============================================================
CREATE TABLE contests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(120)    NOT NULL,
  description     TEXT,
  discipline      discipline_type NOT NULL,
  comp_type       competition_type NOT NULL,  -- duo | groupe
  duration_days   INTEGER NOT NULL CHECK (duration_days IN (30, 60, 90)),
  status          contest_status DEFAULT 'draft',
  -- Dates
  registration_ends_at TIMESTAMPTZ,          -- Fin des inscriptions
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  -- Config groupes
  max_groups      INTEGER DEFAULT 2 CHECK (max_groups BETWEEN 2 AND 4),
  max_members_per_group INTEGER DEFAULT 4 CHECK (max_members_per_group BETWEEN 1 AND 4),
  -- Admin
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger : calculer ends_at automatiquement
CREATE OR REPLACE FUNCTION set_contest_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.starts_at IS NOT NULL THEN
    NEW.ends_at := NEW.starts_at + (NEW.duration_days || ' days')::INTERVAL;
    NEW.registration_ends_at := NEW.starts_at - INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contest_dates
  BEFORE INSERT OR UPDATE ON contests
  FOR EACH ROW EXECUTE FUNCTION set_contest_dates();

-- ============================================================
-- TABLE: groups  ← NOUVEAU
-- Un groupe appartient à une compétition de type "groupe"
-- ============================================================
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id  UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,           -- Nom du groupe
  position    INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  video_id    UUID REFERENCES videos(id),     -- Vidéo soumise par le groupe
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, position)
);

-- ============================================================
-- TABLE: group_members  ← NOUVEAU
-- Membres d'un groupe (1 à 4 par groupe)
-- ============================================================
CREATE TABLE group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  is_leader   BOOLEAN DEFAULT FALSE,          -- Chef de groupe
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- TABLE: candidates  ← MIS À JOUR (pour les Duos)
-- Un candidat = un participant dans une compétition Duo
-- ============================================================
CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id    UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id),
  -- Infos prestation
  name          VARCHAR(100) NOT NULL,
  stage_name    VARCHAR(80),
  discipline    discipline_type NOT NULL,
  track_title   VARCHAR(150),
  track_artist  VARCHAR(100),
  track_genre   VARCHAR(60),
  -- Vidéo liée
  video_id      UUID REFERENCES videos(id),
  -- Position dans le duo (1 ou 2)
  position      INTEGER NOT NULL CHECK (position IN (1, 2)),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_id, position),
  UNIQUE(contest_id, user_id)
);

-- ============================================================
-- TABLE: votes  ← MIS À JOUR
-- Un vote peut cibler un candidat (duo) OU un groupe
-- ============================================================
CREATE TABLE votes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id      UUID NOT NULL REFERENCES users(id),
  contest_id    UUID NOT NULL REFERENCES contests(id),
  -- Cible du vote (l'un ou l'autre selon comp_type)
  candidate_id  UUID REFERENCES candidates(id),
  group_id      UUID REFERENCES groups(id),
  amount        INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Contraintes
  UNIQUE(voter_id, contest_id),               -- 1 vote par concours
  CHECK (
    (candidate_id IS NOT NULL AND group_id IS NULL) OR
    (candidate_id IS NULL AND group_id IS NOT NULL)
  )
);

-- ============================================================
-- TABLE: transactions
-- ============================================================
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('credit','vote','payout','refund')),
  operator      VARCHAR(30),
  phone         VARCHAR(20),
  amount        INTEGER NOT NULL,
  net_amount    INTEGER NOT NULL,
  fee           INTEGER DEFAULT 0,
  ref           VARCHAR(80) UNIQUE,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(100),
  message     TEXT NOT NULL,
  data        JSONB,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: otps
-- ============================================================
CREATE TABLE otps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(20) NOT NULL,
  code        VARCHAR(6) NOT NULL,
  attempts    INTEGER DEFAULT 0,
  verified    BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_videos_user       ON videos(user_id);
CREATE INDEX idx_videos_status     ON videos(status);
CREATE INDEX idx_videos_discipline ON videos(discipline);
CREATE INDEX idx_contests_status   ON contests(status);
CREATE INDEX idx_contests_type     ON contests(comp_type);
CREATE INDEX idx_groups_contest    ON groups(contest_id);
CREATE INDEX idx_group_members_grp ON group_members(group_id);
CREATE INDEX idx_group_members_usr ON group_members(user_id);
CREATE INDEX idx_candidates_ctest  ON candidates(contest_id);
CREATE INDEX idx_votes_contest     ON votes(contest_id);
CREATE INDEX idx_votes_voter       ON votes(voter_id);
CREATE INDEX idx_votes_candidate   ON votes(candidate_id);
CREATE INDEX idx_votes_group       ON votes(group_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_notifs_user       ON notifications(user_id, read);

-- ============================================================
-- FONCTIONS MÉTIER
-- ============================================================

-- Wallet : créer automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Créditer un wallet
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE wallets SET
    balance        = balance + p_amount,
    total_credited = total_credited + p_amount,
    updated_at     = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote Duo — transaction atomique
CREATE OR REPLACE FUNCTION cast_vote_duo(
  p_voter_id    UUID,
  p_candidate_id UUID,
  p_contest_id  UUID
) RETURNS JSON AS $$
DECLARE
  v_balance  INTEGER;
  v_contest  contests%ROWTYPE;
BEGIN
  SELECT * INTO v_contest FROM contests WHERE id = p_contest_id;
  IF v_contest.status != 'active' THEN
    RAISE EXCEPTION 'CONTEST_NOT_ACTIVE';
  END IF;
  IF v_contest.comp_type != 'duo' THEN
    RAISE EXCEPTION 'WRONG_COMPETITION_TYPE';
  END IF;
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_voter_id FOR UPDATE;
  IF COALESCE(v_balance, 0) < 100 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;
  IF EXISTS(SELECT 1 FROM votes WHERE voter_id=p_voter_id AND contest_id=p_contest_id) THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END IF;
  -- Débiter le votant
  UPDATE wallets SET balance=balance-100, total_spent=total_spent+100, updated_at=NOW()
  WHERE user_id = p_voter_id;
  -- Enregistrer le vote
  INSERT INTO votes (voter_id, candidate_id, contest_id, amount)
  VALUES (p_voter_id, p_candidate_id, p_contest_id, 100);
  -- Transaction
  INSERT INTO transactions (user_id, type, amount, net_amount, ref, status)
  VALUES (p_voter_id, 'vote', 100, 100, 'VOTE-DUO-'||gen_random_uuid()::TEXT, 'success');
  RETURN json_build_object('success', true, 'new_balance', v_balance - 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote Groupe — transaction atomique
CREATE OR REPLACE FUNCTION cast_vote_group(
  p_voter_id   UUID,
  p_group_id   UUID,
  p_contest_id UUID
) RETURNS JSON AS $$
DECLARE
  v_balance INTEGER;
  v_contest contests%ROWTYPE;
BEGIN
  SELECT * INTO v_contest FROM contests WHERE id = p_contest_id;
  IF v_contest.status != 'active' THEN
    RAISE EXCEPTION 'CONTEST_NOT_ACTIVE';
  END IF;
  IF v_contest.comp_type != 'groupe' THEN
    RAISE EXCEPTION 'WRONG_COMPETITION_TYPE';
  END IF;
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_voter_id FOR UPDATE;
  IF COALESCE(v_balance, 0) < 100 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;
  IF EXISTS(SELECT 1 FROM votes WHERE voter_id=p_voter_id AND contest_id=p_contest_id) THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END IF;
  UPDATE wallets SET balance=balance-100, total_spent=total_spent+100, updated_at=NOW()
  WHERE user_id = p_voter_id;
  INSERT INTO votes (voter_id, group_id, contest_id, amount)
  VALUES (p_voter_id, p_group_id, p_contest_id, 100);
  INSERT INTO transactions (user_id, type, amount, net_amount, ref, status)
  VALUES (p_voter_id, 'vote', 100, 100, 'VOTE-GRP-'||gen_random_uuid()::TEXT, 'success');
  RETURN json_build_object('success', true, 'new_balance', v_balance - 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clôturer une compétition et distribuer la cagnotte
CREATE OR REPLACE FUNCTION close_contest(p_contest_id UUID)
RETURNS JSON AS $$
DECLARE
  v_type     competition_type;
  v_total    INTEGER;
  v_net      INTEGER;
  v_first    INTEGER;
  v_second   INTEGER;
  v_winner   UUID;
  v_runner   UUID;
BEGIN
  SELECT comp_type INTO v_type FROM contests WHERE id = p_contest_id;

  IF v_type = 'duo' THEN
    SELECT candidate_id INTO v_winner FROM votes
    WHERE contest_id = p_contest_id
    GROUP BY candidate_id ORDER BY COUNT(*) DESC LIMIT 1;

    SELECT candidate_id INTO v_runner FROM votes
    WHERE contest_id = p_contest_id
    GROUP BY candidate_id ORDER BY COUNT(*) DESC OFFSET 1 LIMIT 1;
  ELSE
    SELECT group_id INTO v_winner FROM votes
    WHERE contest_id = p_contest_id
    GROUP BY group_id ORDER BY COUNT(*) DESC LIMIT 1;

    SELECT group_id INTO v_runner FROM votes
    WHERE contest_id = p_contest_id
    GROUP BY group_id ORDER BY COUNT(*) DESC OFFSET 1 LIMIT 1;
  END IF;

  SELECT COUNT(*) * 100 INTO v_total FROM votes WHERE contest_id = p_contest_id;
  v_net    := v_total / 2;         -- 50% restant après prélèvement PAC
  v_first  := (v_net * 80) / 100; -- 80% au 1er
  v_second := (v_net * 20) / 100; -- 20% au 2e

  UPDATE contests SET status='ended', updated_at=NOW() WHERE id=p_contest_id;

  RETURN json_build_object(
    'contest_id',     p_contest_id,
    'comp_type',      v_type,
    'total_pool',     v_total,
    'net_pool',       v_net,
    'winner_payout',  v_first,
    'runner_payout',  v_second,
    'winner_id',      v_winner,
    'runner_id',      v_runner
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_self"       ON users FOR ALL    USING (auth.uid() = id);
CREATE POLICY "users_public_read" ON users FOR SELECT USING (true);

-- Wallets
CREATE POLICY "wallet_owner"     ON wallets FOR ALL  USING (auth.uid() = user_id);

-- Videos : proprio peut tout, autres peuvent lire les approuvées
CREATE POLICY "video_owner"      ON videos FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "video_public_approved" ON videos FOR SELECT
  USING (status = 'approved');
CREATE POLICY "video_moderator"  ON videos FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin','moderator'));

-- Contests : lecture publique, écriture admin
CREATE POLICY "contests_public_read"  ON contests FOR SELECT USING (true);
CREATE POLICY "contests_admin_write"  ON contests FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Groups & members : lecture publique
CREATE POLICY "groups_public_read"    ON groups FOR SELECT USING (true);
CREATE POLICY "group_members_public"  ON group_members FOR SELECT USING (true);
CREATE POLICY "group_members_self"    ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Candidates : lecture publique
CREATE POLICY "candidates_public"     ON candidates FOR SELECT USING (true);
CREATE POLICY "candidates_self"       ON candidates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Votes
CREATE POLICY "votes_public_read"     ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_self"     ON votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- Transactions
CREATE POLICY "tx_owner"              ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifs_owner"          ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- SUPABASE STORAGE — Bucket vidéos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pac-videos',
  'pac-videos',
  false,                                   -- Privé — URLs signées uniquement
  524288000,                               -- 500 MB max
  ARRAY['video/mp4','video/quicktime','video/mov']
);

-- Politique storage : upload par proprio, lecture par tous les connectés
CREATE POLICY "video_upload_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pac-videos' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "video_read_auth" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pac-videos' AND auth.role() = 'authenticated'
  );

-- ============================================================
-- DONNÉES DE DÉMO
-- ============================================================
INSERT INTO contests (title, discipline, comp_type, duration_days, status) VALUES
  ('Grand Prix Danse PAC',    'danse',      'duo',    60, 'active'),
  ('Battle Chant Afrique',    'chant',      'groupe', 60, 'active'),
  ('Rire Sans Frontières',    'humour',     'duo',    30, 'active'),
  ('Slam & Poésie',           'poesie',     'groupe', 90, 'active'),
  ('Guitar Heroes PAC',       'instrument', 'duo',    60, 'active'),
  ('Acapella Challenge',      'acapella',   'groupe', 60, 'active');
