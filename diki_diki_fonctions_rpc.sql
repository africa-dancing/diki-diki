-- ============================================================
-- DIKI-DIKI — INVENTAIRE DES FONCTIONS RPC (à rejouer sur la prod)
-- Reconstitué depuis Supabase le 2026-07-06
-- ⚠️ BROUILLON DE RÉFÉRENCE : à vérifier avant de rejouer en prod
-- ============================================================

-- ============================================================
-- SECTION 1 — FONCTIONS ACTIVES (nouveau système brackets)
-- ============================================================

-- ---- 1.1 vote_bracket_pool (vote au score : star/heart) — COMPLETE ----
CREATE OR REPLACE FUNCTION public.vote_bracket_pool(p_user_id uuid, p_participant_id uuid, p_qty integer DEFAULT 1, p_type text DEFAULT 'star')
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_type    text;
  v_unit    integer;
  v_weight  integer;
  v_qty     integer;
  v_total   integer;
  v_part    record;
  v_bracket record;
  v_round   record;
  v_balance integer;
BEGIN
  v_qty := COALESCE(p_qty, 1);
  IF v_qty < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Quantite invalide.');
  END IF;

  v_type := lower(COALESCE(p_type, 'star'));
  IF v_type NOT IN ('star', 'heart') THEN
    RETURN json_build_object('success', false, 'error', 'Type de vote invalide.');
  END IF;

  IF v_type = 'heart' THEN
    SELECT value::integer INTO v_unit FROM public.settings WHERE key = 'bracket_heart_amount';
    IF v_unit IS NULL THEN v_unit := 200; END IF;
    v_weight := 2;
  ELSE
    SELECT value::integer INTO v_unit FROM public.settings WHERE key = 'bracket_vote_amount';
    IF v_unit IS NULL THEN v_unit := 100; END IF;
    v_weight := 1;
  END IF;
  v_total := v_unit * v_qty;

  SELECT * INTO v_part FROM public.bracket_participants
  WHERE id = p_participant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Candidat introuvable.');
  END IF;
  IF v_part.bracket_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Candidat non rattache a un challenge.');
  END IF;
  IF v_part.eliminated_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ce candidat est elimine.');
  END IF;

  SELECT * INTO v_bracket FROM public.brackets WHERE id = v_part.bracket_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Challenge introuvable.');
  END IF;
  IF v_bracket.status <> 'in_progress' THEN
    RETURN json_build_object('success', false, 'error', 'Le challenge n''est pas en cours.');
  END IF;

  -- Etape active  /*DKDK_VOTE_ROUND_FIX*/
  SELECT * INTO v_round FROM public.bracket_rounds
  WHERE bracket_id = v_part.bracket_id AND status IN ('active','in_progress')
  ORDER BY round DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Aucune etape en cours.');
  END IF;

  SELECT balance INTO v_balance FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant.');
  END IF;

  UPDATE public.wallets SET
    balance     = balance - v_total,
    total_spent = total_spent + v_total,
    updated_at  = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.bracket_votes (duel_id, bracket_id, user_id, participant_vote, montant)
  VALUES (NULL, v_part.bracket_id, p_user_id, p_participant_id, v_total);

  IF v_type = 'heart' THEN
    UPDATE public.bracket_participants
    SET score = score + (v_weight * v_qty), hearts_count = hearts_count + v_qty
    WHERE id = p_participant_id;
  ELSE
    UPDATE public.bracket_participants
    SET score = score + (v_weight * v_qty), stars_count = stars_count + v_qty
    WHERE id = p_participant_id;
  END IF;

  UPDATE public.bracket_rounds SET montant_collecte = montant_collecte + v_total
  WHERE id = v_round.id;

  UPDATE public.brackets SET total_cagnotte = total_cagnotte + v_total
  WHERE id = v_part.bracket_id;

  RETURN json_build_object(
    'success', true,
    'type', v_type,
    'qty', v_qty,
    'montant', v_total,
    'points', v_weight * v_qty,
    'score', v_part.score + (v_weight * v_qty)
  );
END;
$function$;

-- ---- 1.2 vote_bracket (vote sur duel) — COMPLETE ----
CREATE OR REPLACE FUNCTION public.vote_bracket(p_user_id uuid, p_duel_id uuid, p_participant uuid)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_amount integer;
  v_duel record;
  v_balance integer;
BEGIN
  -- Montant du vote depuis les reglages
  SELECT value::integer INTO v_amount
  FROM public.settings WHERE key = 'bracket_vote_amount';
  IF v_amount IS NULL THEN v_amount := 100; END IF;

  -- Le duel doit exister et etre votable
  SELECT * INTO v_duel FROM public.bracket_duels
  WHERE id = p_duel_id AND status IN ('active', 'overtime')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Duel introuvable ou termine.');
  END IF;

  -- Le participant vote doit appartenir au duel
  IF p_participant NOT IN (v_duel.participant_a, v_duel.participant_b) THEN
    RETURN json_build_object('success', false, 'error', 'Participant invalide pour ce duel.');
  END IF;

  -- Verrouiller le wallet et verifier le solde (FOR UPDATE = anti double-clic)
  SELECT balance INTO v_balance FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_amount THEN
    RETURN json_build_object('success', false, 'error', 'Solde insuffisant. Recharge ton compte.');
  END IF;

  -- Debiter
  UPDATE public.wallets SET
    balance     = balance - v_amount,
    total_spent = total_spent + v_amount,
    updated_at  = NOW()
  WHERE user_id = p_user_id;

  -- Tracer le vote
  INSERT INTO public.bracket_votes (duel_id, bracket_id, user_id, participant_vote, montant)
  VALUES (p_duel_id, v_duel.bracket_id, p_user_id, p_participant, v_amount);

  -- Incrementer le compteur du bon cote
  IF p_participant = v_duel.participant_a THEN
    UPDATE public.bracket_duels SET votes_a = votes_a + 1 WHERE id = p_duel_id;
  ELSE
    UPDATE public.bracket_duels SET votes_b = votes_b + 1 WHERE id = p_duel_id;
  END IF;

  -- Score par candidat (pour le classement global) -- AJOUT
  UPDATE public.bracket_participants SET score = score + 1 WHERE id = p_participant;

  -- Cagnotte du round en cours + cagnotte totale du bracket
  UPDATE public.bracket_rounds SET montant_collecte = montant_collecte + v_amount
  WHERE bracket_id = v_duel.bracket_id AND round = v_duel.round;

  UPDATE public.brackets SET total_cagnotte = total_cagnotte + v_amount
  WHERE id = v_duel.bracket_id;

  RETURN json_build_object('success', true, 'montant', v_amount);
END;
$function$;

-- ---- 1.3 credit_wallet (upsert crédit portefeuille) ----
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id, balance, total_credited, updated_at)
  VALUES (p_user_id, p_amount, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance        = wallets.balance + p_amount,
    total_credited = wallets.total_credited + p_amount,
    updated_at     = NOW();
END;
$function$;

-- ---- 1.4 generate_bracket_code ----
CREATE OR REPLACE FUNCTION public.generate_bracket_code(p_discipline text, p_categorie text, p_style text, p_launch_date timestamptz)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_jour text;
  v_mm text;
  v_yyyy text;
  v_seq integer;
  v_base text;
  v_code text;
BEGIN
  v_jour := (ARRAY['LU','MA','ME','JE','VE','SA','DI'])
            [EXTRACT(ISODOW FROM p_launch_date)::int];
  v_mm := to_char(p_launch_date, 'MM');
  v_yyyy := to_char(p_launch_date, 'YYYY');

  -- Nettoyage : on ne garde que lettres et chiffres dans chaque segment
  v_base := 'Diki-Diki-' || regexp_replace(upper(p_discipline), '[^A-Z0-9]', '', 'g');
  IF p_categorie IS NOT NULL AND p_categorie <> '' THEN
    v_base := v_base || '-' || regexp_replace(upper(p_categorie), '[^A-Z0-9]', '', 'g');
  END IF;
  IF p_style IS NOT NULL AND p_style <> '' THEN
    v_base := v_base || '-' || regexp_replace(upper(p_style), '[^A-Z0-9]', '', 'g');
  END IF;

  SELECT COALESCE(MAX(
           (regexp_match(code, '-(\d{3})$'))[1]::int
         ), 0) + 1
  INTO v_seq
  FROM public.brackets
  WHERE code LIKE v_base || '-%-' || v_mm || '-' || v_yyyy || '-%';

  v_code := v_base || '-' || v_jour || '-' || v_mm || '-' || v_yyyy
            || '-' || lpad(v_seq::text, 3, '0');
  RETURN v_code;
END;
$function$;

-- ---- 1.5 increment_bracket_cagnotte ----
CREATE OR REPLACE FUNCTION public.increment_bracket_cagnotte(p_bracket_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE brackets
  SET total_cagnotte = total_cagnotte + p_amount,
      updated_at     = NOW()
  WHERE id = p_bracket_id;
END;
$function$;

-- ---- 1.6 get_monitoring_stats — COMPLETE ----
CREATE OR REPLACE FUNCTION public.get_monitoring_stats()
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'generated_at', NOW(),
    'videos', json_build_object(
      'total',       (SELECT COUNT(*) FROM videos),
      'by_status',   (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
                        FROM (SELECT status, COUNT(*) AS cnt FROM videos GROUP BY status) s),
      'storage_mb',  (SELECT COALESCE(SUM(file_size_mb), 0) FROM videos),
      'storage_gb',  (SELECT ROUND(COALESCE(SUM(file_size_mb), 0) / 1024.0, 2) FROM videos),
      'total_views', (SELECT COALESCE(SUM(views), 0) FROM videos),
      'bandwidth_mb',(SELECT COALESCE(SUM(views * file_size_mb), 0) FROM videos),
      'bandwidth_gb',(SELECT ROUND(COALESCE(SUM(views * file_size_mb), 0) / 1024.0, 2) FROM videos)
    ),
    'users', json_build_object(
      'total', (SELECT COUNT(*) FROM users)
    ),
    'otps', json_build_object(
      'total',    (SELECT COUNT(*) FROM otps),
      'verified', (SELECT COUNT(*) FROM otps WHERE verified = true)
    ),
    'transactions', json_build_object(
      'total',          (SELECT COUNT(*) FROM transactions),
      'by_status',      (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
                           FROM (SELECT status, COUNT(*) AS cnt FROM transactions GROUP BY status) t),
      'amount_success', (SELECT COALESCE(SUM(amount), 0)     FROM transactions WHERE status = 'success'),
      'fee_success',    (SELECT COALESCE(SUM(fee), 0)        FROM transactions WHERE status = 'success'),
      'net_success',    (SELECT COALESCE(SUM(net_amount), 0) FROM transactions WHERE status = 'success')
    ),
    'wallets', json_build_object(
      'balance_total',  (SELECT COALESCE(SUM(balance), 0)        FROM wallets),
      'credited_total', (SELECT COALESCE(SUM(total_credited), 0) FROM wallets),
      'spent_total',    (SELECT COALESCE(SUM(total_spent), 0)    FROM wallets)
    ),
    'brackets', json_build_object(
      'total',     (SELECT COUNT(*) FROM brackets),
      'by_status', (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json)
                      FROM (SELECT status, COUNT(*) AS cnt FROM brackets GROUP BY status) b)
    ),
    'votes', json_build_object(
      'total', (SELECT COUNT(*) FROM bracket_votes)
    )
  );
$function$;

-- ============================================================
-- SECTION 2 — TRIGGERS SYSTÈME (à garder)
-- ============================================================

-- ---- 2.1 handle_new_user (crée un wallet à l'inscription) ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- ---- 2.2 update_updated_at (met à jour le timestamp) ----
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================
-- SECTION 3 — FONCTIONS ÉDUCATION (garder pour le module à venir)
-- ============================================================

-- ---- 3.1 soutenir_lecon ----
CREATE OR REPLACE FUNCTION public.soutenir_lecon(p_lecon_id uuid, p_user_id uuid, p_createur_id uuid, p_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_montant         INTEGER;
  v_montant_createur INTEGER;
  v_montant_dkdk    INTEGER;
  v_soutien_id      UUID;
BEGIN
  -- Montant selon le type
  v_montant := CASE p_type WHEN 'like' THEN 10 ELSE 20 END;

  -- Répartition 50/50
  v_montant_createur := v_montant / 2;
  v_montant_dkdk     := v_montant / 2;

  -- Insérer le soutien
  INSERT INTO soutiens (lecon_id, user_id, createur_id, type, montant)
  VALUES (p_lecon_id, p_user_id, p_createur_id, p_type, v_montant)
  RETURNING id INTO v_soutien_id;

  -- Créditer le créateur (50%)
  INSERT INTO portefeuilles (user_id, solde, updated_at)
  VALUES (p_createur_id, v_montant_createur, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    solde      = portefeuilles.solde + v_montant_createur,
    updated_at = NOW();

  -- Enregistrer la transaction
  INSERT INTO transactions_education (
    soutien_id, createur_id, user_id, type,
    montant_total, montant_createur, montant_dkdk, status
  )
  VALUES (
    v_soutien_id, p_createur_id, p_user_id, p_type,
    v_montant, v_montant_createur, v_montant_dkdk, 'completed'
  );
END;
$function$;

-- ---- 3.2 soutenir_video — COMPLETE ----
CREATE OR REPLACE FUNCTION public.soutenir_video(p_user_id uuid, p_artist_id uuid, p_video_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_balance INTEGER;
  v_montant INTEGER;
  v_gain    INTEGER;
  v_fee     INTEGER;
BEGIN
  -- Lire le montant depuis settings (fallback 10 si absent), forcer pair
  SELECT COALESCE((SELECT value::int FROM settings WHERE key = 'soutenir_amount'), 10) INTO v_montant;
  IF v_montant IS NULL OR v_montant < 2 THEN v_montant := 10; END IF;
  IF v_montant % 2 <> 0 THEN v_montant := v_montant - 1; END IF;  -- forcer pair
  v_gain := v_montant / 2;
  v_fee  := v_montant - v_gain;

  -- Verifier le solde
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_montant THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Debiter le soutenant
  UPDATE wallets SET
    balance     = balance - v_montant,
    total_spent = total_spent + v_montant,
    updated_at  = NOW()
  WHERE user_id = p_user_id;

  -- Crediter l'artiste (moitie)
  INSERT INTO wallets (user_id, balance, total_credited)
  VALUES (p_artist_id, v_gain, v_gain)
  ON CONFLICT (user_id) DO UPDATE SET
    balance        = wallets.balance + v_gain,
    total_credited = wallets.total_credited + v_gain,
    updated_at     = NOW();

  -- Tracer la transaction
  INSERT INTO transactions (user_id, type, amount, net_amount, fee, status, metadata, created_at)
  VALUES (
    p_user_id, 'soutenir', v_montant, v_gain, v_fee, 'success',
    jsonb_build_object('video_id', p_video_id, 'artist_id', p_artist_id),
    NOW()
  );

  RETURN json_build_object('success', true, 'gain_artiste', v_gain, 'fee_plateforme', v_fee);
END;
$function$;

-- ============================================================
-- SECTION 4 — FONCTIONS ANCIEN SYSTÈME (contests) — À VÉRIFIER
-- Probablement obsolètes (remplacées par le système brackets).
-- Ne pas supprimer sans avoir vérifié qu'aucun code ne les appelle.
-- ============================================================

-- ---- 4.1 cast_vote_duo (OBSOLÈTE ? utilise contests/votes) ----
CREATE OR REPLACE FUNCTION public.cast_vote_duo(p_voter_id uuid, p_candidate_id uuid, p_contest_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- ---- 4.2 close_contest (OBSOLÈTE ? utilise contests) ----
CREATE OR REPLACE FUNCTION public.close_contest(p_contest_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_net    INTEGER;
  v_first  INTEGER;
  v_second INTEGER;
BEGIN
  SELECT COUNT(*) * 50 INTO v_net FROM votes WHERE contest_id = p_contest_id;
  v_first  := (v_net * 75) / 100;
  v_second := (v_net * 25) / 100;
  UPDATE contests SET status='ended' WHERE id=p_contest_id;
  RETURN json_build_object('winner_payout', v_first, 'runner_payout', v_second);
END;
$function$;

-- ---- 4.3 set_contest_dates (OBSOLÈTE ? trigger sur contests) ----
CREATE OR REPLACE FUNCTION public.set_contest_dates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.starts_at IS NOT NULL THEN
    NEW.ends_at := NEW.starts_at + (NEW.duration_days || ' days')::INTERVAL;
    NEW.registration_ends_at := NEW.starts_at - INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- FIN — Les 13 fonctions RPC sont maintenant COMPLETES (extraites de Supabase).
-- Reste a documenter pour l'inventaire pre-prod complet :
--   1. Colonnes ajoutees manuellement aux tables (final_path, stars_count,
--      hearts_count, mode, track_id...)
--   2. Contraintes CHECK modifiees (musiques_source_check, transactions.type,
--      transactions.status...)
--   3. Les CREATE TRIGGER qui relient les fonctions trigger aux tables
--      (handle_new_user -> users, update_updated_at -> tables, set_contest_dates)
-- ============================================================

-- ============================================================
-- SECTION 5 — TRIGGERS (CREATE TRIGGER) — extraits de Supabase
-- ============================================================

-- ---- 5.1 profiles_updated_at (ACTIF) : maj auto du updated_at ----
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ---- 5.2 trg_contest_dates (ANCIEN SYSTEME contests — a verifier) ----
DROP TRIGGER IF EXISTS trg_contest_dates ON public.contests;
CREATE TRIGGER trg_contest_dates
  BEFORE INSERT OR UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contest_dates();

-- ---- 5.3 on_auth_user_created (ACTIF) : cree un wallet a l'inscription ----
-- CONFIRME depuis Supabase : ce trigger est sur auth.users (schema auth).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SECTION 6 — CONTRAINTES CHECK — extraites de Supabase
-- (16 contraintes au total ; les modifs manuelles sont signalees)
-- ============================================================

-- ---- Contraintes du systeme actuel (brackets / paiements) ----

-- final_path : chemin finale/bronze sur les participants
ALTER TABLE public.bracket_participants
  DROP CONSTRAINT IF EXISTS bracket_participants_final_path_check;
ALTER TABLE public.bracket_participants
  ADD CONSTRAINT bracket_participants_final_path_check
  CHECK (final_path = ANY (ARRAY['finale'::text, 'bronze'::text]));

-- musiques.source : ELARGIE pour inclure 'admin' (modif manuelle)
ALTER TABLE public.musiques
  DROP CONSTRAINT IF EXISTS musiques_source_check;
ALTER TABLE public.musiques
  ADD CONSTRAINT musiques_source_check
  CHECK (source = ANY (ARRAY['manuel'::text, 'musicbrainz'::text, 'admin'::text]));

-- musiques.status
ALTER TABLE public.musiques
  DROP CONSTRAINT IF EXISTS musiques_status_check;
ALTER TABLE public.musiques
  ADD CONSTRAINT musiques_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text]));

-- transactions.status : accepte pending/success/failed
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check
  CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[]));

-- transactions.type : ETENDUE (credit/vote/payout/refund/bracket_win...) (modif manuelle)
-- ⚠️ FIN A CONFIRMER : la definition etait coupee apres 'bracket_w...'
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK ((type)::text = ANY ((ARRAY['credit'::character varying, 'vote'::character varying, 'payout'::character varying, 'refund'::character varying, 'bracket_win'::character varying /* + soutenir ? a confirmer */])::text[]));

-- videos.challenge_type : C2/C4/C8/C12/C16
-- ⚠️ FIN A CONFIRMER : la definition etait coupee apres 'C16...'
ALTER TABLE public.videos
  DROP CONSTRAINT IF EXISTS videos_challenge_type_check;
ALTER TABLE public.videos
  ADD CONSTRAINT videos_challenge_type_check
  CHECK ((challenge_type)::text = ANY ((ARRAY['C2'::character varying, 'C4'::character varying, 'C8'::character varying, 'C12'::character varying, 'C16'::character varying])::text[]));

-- wallets.balance : ne peut pas etre negatif
ALTER TABLE public.wallets
  DROP CONSTRAINT IF EXISTS wallets_balance_check;
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_balance_check
  CHECK (balance >= 0);

-- comments.content : max 500 caracteres
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_content_check;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_content_check
  CHECK (char_length(content) <= 500);

-- ---- Contraintes EDUCATION ----

-- lecons.format
ALTER TABLE public.lecons
  DROP CONSTRAINT IF EXISTS lecons_format_check;
ALTER TABLE public.lecons
  ADD CONSTRAINT lecons_format_check
  CHECK (format = ANY (ARRAY['video'::text, 'texte_video'::text, 'audio'::text]));

-- notes_lecons.note : entre 0 et 20
ALTER TABLE public.notes_lecons
  DROP CONSTRAINT IF EXISTS notes_lecons_note_check;
ALTER TABLE public.notes_lecons
  ADD CONSTRAINT notes_lecons_note_check
  CHECK ((note >= 0) AND (note <= 20));

-- soutiens.type : like / etoile
ALTER TABLE public.soutiens
  DROP CONSTRAINT IF EXISTS soutiens_type_check;
ALTER TABLE public.soutiens
  ADD CONSTRAINT soutiens_type_check
  CHECK (type = ANY (ARRAY['like'::text, 'etoile'::text]));

-- ---- Contraintes ANCIEN SYSTEME (contests / candidates / groups) — a verifier ----

-- candidates.position
ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_position_check;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_position_check
  CHECK ("position" = ANY (ARRAY[1, 2]));

-- contests.duration_days
ALTER TABLE public.contests
  DROP CONSTRAINT IF EXISTS contests_duration_days_check;
ALTER TABLE public.contests
  ADD CONSTRAINT contests_duration_days_check
  CHECK (duration_days = ANY (ARRAY[30, 60, 90]));

-- contests.max_groups
ALTER TABLE public.contests
  DROP CONSTRAINT IF EXISTS contests_max_groups_check;
ALTER TABLE public.contests
  ADD CONSTRAINT contests_max_groups_check
  CHECK ((max_groups >= 2) AND (max_groups <= 4));

-- contests.max_members_per_group
ALTER TABLE public.contests
  DROP CONSTRAINT IF EXISTS contests_max_members_per_group_check;
ALTER TABLE public.contests
  ADD CONSTRAINT contests_max_members_per_group_check
  CHECK ((max_members_per_group >= 1) AND (max_members_per_group <= 4 /* borne haute a confirmer */));

-- groups.position
ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_position_check;
ALTER TABLE public.groups
  ADD CONSTRAINT groups_position_check
  CHECK (("position" >= 1) AND ("position" <= 4));

-- ============================================================
-- FIN SECTION 6
-- ⚠️ 3 contraintes ont une borne/fin a confirmer (marquees a confirmer) :
--    transactions_type_check, videos_challenge_type_check,
--    contests_max_members_per_group_check
-- ============================================================
