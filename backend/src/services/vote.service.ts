import { supabase } from '../../config/supabase';

const MIN_VOTE = 100;
const MAX_VOTE = 100000;

export async function castVote(userId: string, videoId: string, amount: number = 100) {

  // Validation du montant
  if (!Number.isInteger(amount) || amount < MIN_VOTE || amount > MAX_VOTE || amount % 100 !== 0) {
    throw new Error('INVALID_AMOUNT');
  }

  // Récupérer le solde utilisateur
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('wallet')
    .eq('id', userId)
    .single();

  if (userError || !user) throw new Error('USER_NOT_FOUND');
  if (user.wallet < amount)  throw new Error('INSUFFICIENT_BALANCE');

  // Multi-vote activé — pas de vérification de vote existant

  // Insérer le vote avec le montant choisi
  const { error: voteError } = await supabase
    .from('votes')
    .insert({
      voter_id:   userId,
      video_id:   videoId,
      amount:     amount,
      created_at: new Date().toISOString(),
    });

  if (voteError) throw new Error('VOTE_FAILED');

  // Déduire le montant du wallet
  const { error: walletError } = await supabase
    .from('users')
    .update({ wallet: user.wallet - amount })
    .eq('id', userId);

  if (walletError) throw new Error('WALLET_UPDATE_FAILED');

  return {
    message:        'VOTE_SUCCESS',
    amount_voted:   amount,
    new_balance:    user.wallet - amount,
    remaining:      user.wallet - amount,
    votesRemaining: Math.floor((user.wallet - amount) / MIN_VOTE),
  };
}

export async function getWalletBalance(userId: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('wallet')
    .eq('id', userId)
    .single();

  if (error || !user) throw new Error('USER_NOT_FOUND');

  return {
    balance:        user.wallet,
    votesAvailable: Math.floor(user.wallet / MIN_VOTE),
    canVote:        user.wallet >= MIN_VOTE,
  };
}