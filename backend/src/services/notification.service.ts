import axios from 'axios';
import { supabase } from '../../config/supabase';

// ── Configuration Africa's Talking ───────────────────────
const AT_BASE    = 'https://api.africastalking.com/version1';
const SENDER_ID  = process.env.AT_SENDER || 'PAC';
const IS_PROD    = process.env.NODE_ENV === 'production';

// ── Types de notifications ────────────────────────────────
export type NotifType =
  | 'otp'
  | 'welcome'
  | 'video_pending'
  | 'video_approved'
  | 'video_rejected'
  | 'vote_received'
  | 'vote_milestone'
  | 'wallet_credited'
  | 'wallet_low'
  | 'wallet_alert_third';

// ── Envoi SMS via Africa's Talking ───────────────────────
async function sendSMS(to: string, message: string): Promise<void> {
  if (!IS_PROD) {
    (`\n📱 [SMS DEV] → ${to}\n${message}\n`);
    return;
  }
  await axios.post(
    `${AT_BASE}/messaging`,
    new URLSearchParams({
      username: process.env.AT_USERNAME!,
      to,
      message,
      from: SENDER_ID,
    }),
    {
      headers: {
        apiKey:         process.env.AT_API_KEY!,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept:         'application/json',
      },
    }
  );
}

// ── Sauvegarder la notif en base ET envoyer le SMS ───────
async function notify(
  userId:  string,
  type:    NotifType,
  title:   string,
  message: string,
  smsText: string,
  data?:   Record<string, any>
): Promise<void> {
  // 1. Enregistrer en base (notification in-app)
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    data: data || {},
  });

  // 2. Récupérer le numéro de téléphone
  const { data: user } = await supabase
    .from('users')
    .select('phone')
    .eq('id', userId)
    .single();

  if (!user?.phone) return;

  // 3. Envoyer le SMS
  await sendSMS(user.phone, smsText);
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS PAR ÉVÉNEMENT
// ═══════════════════════════════════════════════════════════

// ── 1. OTP — Code de vérification ────────────────────────
export async function notifyOTP(phone: string, code: string): Promise<void> {
  const msg =
    `🏆 Diki-Diki\n` +
    `Votre code de vérification : ${code}\n` +
    `Valable 10 minutes. Ne le partagez jamais.`;
  await sendSMS(phone, msg);
}

// ── 2. Bienvenue à l'inscription ─────────────────────────
export async function notifyWelcome(userId: string, firstName: string): Promise<void> {
  await notify(
    userId,
    'welcome',
    'Bienvenue sur PAC !',
    `Bienvenue ${firstName} ! Votre compte est actif. Créditez votre compte et participez aux compétitions.`,
    `🏆 Bienvenue ${firstName} sur Diki-Diki !\n` +
    `Votre compte est actif. Déposez votre vidéo et rejoignez une compétition.\n` +
    `Min. 1 000 F CFA pour voter. Bonne chance !`
  );
}

// ── 3. Vidéo soumise — en attente de modération ──────────
export async function notifyVideoSubmitted(
  userId: string, discipline: string
): Promise<void> {
  await notify(
    userId,
    'video_pending',
    'Vidéo reçue !',
    `Votre vidéo de ${discipline} a bien été reçue. Validation sous 24 à 48h.`,
    `🎬 Diki-Diki\n` +
    `Votre vidéo de ${discipline} a été reçue !\n` +
    `Notre équipe la validera sous 24 à 48h.\n` +
    `Vous serez notifié(e) dès la décision.`
  );
}

// ── 4. Vidéo validée ─────────────────────────────────────
export async function notifyVideoApproved(
  userId: string, discipline: string
): Promise<void> {
  await notify(
    userId,
    'video_approved',
    'Vidéo validée ✓',
    `Votre vidéo de ${discipline} a été validée ! Vous pouvez maintenant rejoindre une compétition.`,
    `✅ Diki-Diki\n` +
    `Votre vidéo de ${discipline} est validée !\n` +
    `Rejoignez maintenant une compétition et commencez à collecter des votes.\n` +
    `Bonne chance ! 🎉`,
    { discipline }
  );
}

// ── 5. Vidéo refusée ─────────────────────────────────────
export async function notifyVideoRejected(
  userId: string, discipline: string, reason: string
): Promise<void> {
  await notify(
    userId,
    'video_rejected',
    'Vidéo refusée',
    `Votre vidéo de ${discipline} n'a pas été validée. Motif : ${reason}`,
    `❌ Diki-Diki\n` +
    `Votre vidéo de ${discipline} n'a pas été validée.\n` +
    `Motif : ${reason}\n` +
    `Vous pouvez soumettre une nouvelle vidéo sur l'application.`,
    { discipline, reason }
  );
}

// ── 7. Vote reçu ─────────────────────────────────────────
export async function notifyVoteReceived(
  candidateId: string,
  voterCountry: string,
  totalVotes:   number,
  cagnotte:     number
): Promise<void> {
  await notify(
    candidateId,
    'vote_received',
    '+1 vote !',
    `Vous venez de recevoir un vote depuis ${voterCountry}. Total : ${totalVotes} votes — Cagnotte : ${cagnotte.toLocaleString('fr-FR')} F CFA`,
    `🗳️ Diki-Diki\n` +
    `+1 vote depuis ${voterCountry} !\n` +
    `Total : ${totalVotes.toLocaleString('fr-FR')} votes\n` +
    `Votre cagnotte : ${cagnotte.toLocaleString('fr-FR')} F CFA`,
    { voterCountry, totalVotes, cagnotte }
  );
}

// ── 8. Paliers de votes (50, 100, 500, 1000...) ──────────
export async function notifyVoteMilestone(
  userId:    string,
  milestone: number,
  cagnotte:  number
): Promise<void> {
  const emojis: Record<number, string> = {
    50:   '🎯', 100: '💯', 500: '🔥',
    1000: '🚀', 5000: '🏆', 10000: '👑',
  };
  const emoji = emojis[milestone] || '⭐';
  await notify(
    userId,
    'vote_milestone',
    `${milestone} votes atteints ! ${emoji}`,
    `Incroyable ! Vous avez atteint ${milestone} votes. Continuez à partager votre profil !`,
    `${emoji} Diki-Diki\n` +
    `${milestone.toLocaleString('fr-FR')} votes atteints !\n` +
    `Cagnotte actuelle : ${cagnotte.toLocaleString('fr-FR')} F CFA\n` +
    `Continuez à partager votre profil !`,
    { milestone, cagnotte }
  );
}

// ── 12. Compte crédité (Mobile Money) ────────────────────
export async function notifyWalletCredited(
  userId:   string,
  amount:   number,
  operator: string,
  balance:  number
): Promise<void> {
  await notify(
    userId,
    'wallet_credited',
    'Compte crédité',
    `+${amount.toLocaleString('fr-FR')} F CFA via ${operator}. Nouveau solde : ${balance.toLocaleString('fr-FR')} F CFA`,
    `💰 Diki-Diki\n` +
    `+${amount.toLocaleString('fr-FR')} F CFA crédités via ${operator} !\n` +
    `Nouveau solde : ${balance.toLocaleString('fr-FR')} F CFA\n` +
    `Votes disponibles : ${Math.floor(balance / 100)}`,
    { amount, operator, balance }
  );
}

// ── 13. Solde faible — alertes 1/3 · 2/3 · 3/3 ──────────
export async function notifyWalletLow(
  userId:   string,
  balance:  number,
  level:    '1/3' | '2/3' | '3/3'
): Promise<void> {
  const isZero    = level === '3/3';
  const emoji     = isZero ? '🔴' : level === '2/3' ? '🟡' : '🟢';
  const levelText = isZero ? 'épuisé' : `à ${level}`;
  await notify(
    userId,
    'wallet_low',
    `Solde ${levelText}`,
    `Votre solde est ${levelText} : ${balance.toLocaleString('fr-FR')} F CFA. ${isZero ? 'Rechargez pour continuer à voter.' : ''}`,
    `${emoji} Diki-Diki\n` +
    `Votre solde est ${levelText} !\n` +
    `Solde actuel : ${balance.toLocaleString('fr-FR')} F CFA\n` +
    (isZero
      ? `Rechargez via Mobile Money pour continuer à voter.`
      : `Il vous reste ${Math.floor(balance / 100)} vote${balance >= 200 ? 's' : ''}.`),
    { balance, level }
  );
}

// ═══════════════════════════════════════════════════════════
// DISPATCHER PRINCIPAL
// Appelé par les services métier après chaque événement
// ═══════════════════════════════════════════════════════════
export const notifications = {
  otp:             notifyOTP,
  welcome:         notifyWelcome,
  videoSubmitted:  notifyVideoSubmitted,
  videoApproved:   notifyVideoApproved,
  videoRejected:   notifyVideoRejected,
  voteReceived:    notifyVoteReceived,
  voteMilestone:   notifyVoteMilestone,
  walletCredited:  notifyWalletCredited,
  walletLow:       notifyWalletLow,
};

// ═══════════════════════════════════════════════════════════
// JOB CRON : vérifications automatiques (à lancer toutes les heures)
// ═══════════════════════════════════════════════════════════
export async function runNotificationJobs(): Promise<void> {
  await checkWalletAlerts();
}

// Alertes solde faible
async function checkWalletAlerts(): Promise<void> {
  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, balance, total_credited');

  for (const w of wallets || []) {
    if (!w.total_credited || w.total_credited === 0) continue;
    const ratio = w.balance / w.total_credited;
    if (w.balance === 0) {
      await notifyWalletLow(w.user_id, w.balance, '3/3');
    } else if (ratio <= 0.33) {
      await notifyWalletLow(w.user_id, w.balance, '1/3');
    } else if (ratio <= 0.66) {
      await notifyWalletLow(w.user_id, w.balance, '2/3');
    }
  }
}
