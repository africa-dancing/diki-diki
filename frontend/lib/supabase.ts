import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Realtime : votes d'un concours ───────────────────────
export function subscribeToContest(contestId: string, onVote: (p: any) => void) {
  return supabase.channel(`contest-${contestId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'votes',
      filter: `contest_id=eq.${contestId}`,
    }, onVote)
    .subscribe();
}

// ── Realtime : wallet d'un utilisateur ───────────────────
export function subscribeToWallet(userId: string, onUpdate: (p: any) => void) {
  return supabase.channel(`wallet-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'wallets',
      filter: `user_id=eq.${userId}`,
    }, onUpdate)
    .subscribe();
}

// ── Realtime : notifications ──────────────────────────────
export function subscribeToNotifications(userId: string, onNew: (p: any) => void) {
  return supabase.channel(`notifs-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, onNew)
    .subscribe();
}
