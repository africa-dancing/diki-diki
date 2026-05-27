import { Request, Response } from 'express';
import { castVote, getWalletBalance } from '../services/vote.service';

// ── VOTER ────────────────────────────────────────────────────────
export async function vote(req: Request, res: Response) {
  try {
    const userId              = (req as any).user.userId;
    const { video_id, amount } = req.body;

    if (!video_id) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // Montant en nombre entier, défaut 100 F
    const voteAmount = Number.isInteger(Number(amount)) ? Number(amount) : 100;

    const result = await castVote(userId, video_id, voteAmount);
    return res.status(200).json(result);

  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return res.status(402).json({ error: 'INSUFFICIENT_BALANCE', message: 'Solde insuffisant. Rechargez votre compte.' });
    }
    if (err.message === 'INVALID_AMOUNT') {
      return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Montant invalide. Entre 100 F et 100 000 F, multiple de 100.' });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    return res.status(500).json({ error: 'VOTE_FAILED' });
  }
}

// ── SOLDE ─────────────────────────────────────────────────────────
export async function walletBalance(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const data   = await getWalletBalance(userId);
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'WALLET_ERROR' });
  }
}

// ── VÉRIFIER SI DÉJÀ VOTÉ ────────────────────────────────────────
export async function hasVoted(req: Request, res: Response) {
  try {
    const userId  = (req as any).user.userId;
    const videoId = req.params.contestId;

    const { data, error } = await (await import('../../config/supabase')).supabase
      .from('votes')
      .select('*')
      .eq('voter_id', userId)
      .eq('video_id', videoId)
      .single();

    if (error || !data) return res.status(200).json({ voted: false });
    return res.status(200).json({ voted: true, vote: data });

  } catch {
    return res.status(200).json({ voted: false });
  }
}