-- ============================================================
-- RPC : get_solvabilite()
-- Calcule le passif de la plateforme (ce qu'elle doit a ses utilisateurs)
-- et le confronte a la caisse FedaPay (saisie manuellement en parametre).
--
-- FORMULE (alignee sur getBalance / getEarnings du backend) :
--   Poche 1 (votes non depenses) = SUM(wallets.balance)
--   Poche 2 (gains non retires)  = SUM(bracket_win + soutien_gain, success)
--                                - SUM(payout, status IN pending/sent/success)
--   PASSIF = Poche 1 + Poche 2
--   RETIRABLE = caisse_fedapay - PASSIF
--
-- IMPORTANT : la caisse FedaPay n'existe PAS en base. Elle vit chez FedaPay.
-- Tu la lis sur le dashboard FedaPay (champ "Disponible") et tu la passes
-- en parametre. Si tu ne la connais pas, appelle avec 0 : tu verras au moins
-- le passif.
--
-- A EXECUTER DANS L'EDITEUR SQL DE SUPABASE.
-- Idempotent : CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION get_solvabilite(p_caisse_fedapay numeric DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_poche1_votes      numeric := 0;  -- somme des wallets (argent de vote non depense)
  v_gains_gagnes      numeric := 0;  -- bracket_win + soutien_gain, success
  v_retraits_reserves numeric := 0;  -- payout pending/sent/success (argent deja engage)
  v_poche2_gains      numeric := 0;  -- gains non encore retires
  v_passif            numeric := 0;  -- total du a tous les utilisateurs
  v_retirable         numeric := 0;  -- ce que TOI tu peux sortir sans mettre en defaut
  v_nb_wallets_actifs integer := 0;  -- wallets avec un solde > 0
BEGIN
  -- ---- Poche 1 : argent de vote non depense ----
  SELECT COALESCE(SUM(balance), 0),
         COUNT(*) FILTER (WHERE balance > 0)
    INTO v_poche1_votes, v_nb_wallets_actifs
    FROM wallets;

  -- ---- Poche 2, terme A : gains reellement gagnes (deja nets de commission) ----
  SELECT COALESCE(SUM(amount), 0)
    INTO v_gains_gagnes
    FROM transactions
   WHERE type IN ('bracket_win', 'soutien_gain')
     AND status = 'success';

  -- ---- Poche 2, terme B : retraits deja engages (meme les pending) ----
  -- Aligne sur getBalance : un payout pending "reserve" deja l'argent.
  SELECT COALESCE(SUM(amount), 0)
    INTO v_retraits_reserves
    FROM transactions
   WHERE type = 'payout'
     AND status IN ('pending', 'sent', 'success');

  v_poche2_gains := v_gains_gagnes - v_retraits_reserves;
  IF v_poche2_gains < 0 THEN
    v_poche2_gains := 0;  -- garde-fou : jamais de passif negatif
  END IF;

  -- ---- Passif total et solde retirable ----
  v_passif    := v_poche1_votes + v_poche2_gains;
  v_retirable := p_caisse_fedapay - v_passif;

  RETURN json_build_object(
    'caisse_fedapay',      p_caisse_fedapay,
    'passif_total',        v_passif,
    'retirable_par_admin', v_retirable,
    'solvable',            (p_caisse_fedapay >= v_passif),
    'detail', json_build_object(
      'poche1_votes_non_depenses', v_poche1_votes,
      'nb_wallets_actifs',         v_nb_wallets_actifs,
      'poche2_gains_non_retires',  v_poche2_gains,
      'gains_gagnes_bruts',        v_gains_gagnes,
      'retraits_reserves',         v_retraits_reserves
    ),
    'calcule_le', now()
  );
END;
$$;
