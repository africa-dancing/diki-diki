import { supabase } from '../../config/supabase';
const MIN_VOTE = 100;
const MAX_VOTE = 100000;
export async function castVote(userId: string, videoId: string, amount: number = 100) {
  if (!Number.isInteger(amount) || amount < MIN_VOTE || amount > MAX_VOTE || amount % 100 !== 0) {
    throw new Error('INVALID_AMOUNT');
  }
  const { data: w, error: wErr } = await supabase
    .from('wallets')
    .select('balance, total_spent')
    .eq('user_id', userId)
    .single();
  if (wErr || !w) throw new Error('USER_NOT_FOUND');
  if (w.balance < amount) throw new Error('INSUFFICIENT_BALANCE');
  const { error: voteError } = await supabase
    .from('votes')
    .insert({
      voter_id:   userId,
      video_id:   videoId,
      amount:     amount,
      created_at: new Date().toISOString(),
    });
  if (voteError) throw new Error('VOTE_FAILED');
  const { error: walletError } = await supabase
    .from('wallets')
    .update({ balance: w.balance - amount, total_spent: (w.total_spent ?? 0) + amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (walletError) throw new Error('WALLET_UPDATE_FAILED');
  return {
    message:        'VOTE_SUCCESS',
    amount_voted:   amount,
    new_balance:    w.balance - amount,
    remaining:      w.balance - amount,
    votesRemaining: Math.floor((w.balance - amount) / MIN_VOTE),
  };
}
export async function getWalletBalance(userId: string) {
  const { data: w } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();
  const balance = w?.balance ?? 0;
  return {
    balance,
    votesAvailable: Math.floor(balance / MIN_VOTE),
    canVote:        balance >= MIN_VOTE,
  };
}
