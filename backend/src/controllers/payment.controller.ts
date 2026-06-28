import { Request, Response } from 'express';
import { initiatePayment, verifyPayment, withdrawPayment } from '../services/payment.service';
import { supabase } from '../../config/supabase';

const MIN_RETRAIT = 5000;
const MAX_RETRAIT = 500000;

// ─── INITIER UN PAIEMENT (recharge) ─────────────────────────
export async function initiate(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { amount, phone, operator } = req.body;

    if (!amount || !phone || !operator) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    if (amount < 100 || amount > 100000) {
      return res.status(400).json({ error: 'INVALID_AMOUNT' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    const result = await initiatePayment({
      amount,
      phone,
      operator: 'mtn',
      userId,
      userEmail: user?.email || 'user@dkdk.com',
      firstName: user?.first_name || 'User',
      lastName:  user?.last_name  || 'DKDK',
    });

    return res.status(200).json({ success: true, ...result });

  } catch (err: any) {
    return res.status(500).json({ error: 'PAYMENT_FAILED' });
  }
}

/*DKDK_VOTE_PAY*/
// --- INITIER UN PAIEMENT DE VOTE (visiteur one-tap) ---
export async function initiateVotePayment(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    /*DKDK_VOTE_QTY*/
    const { participant_id, vote_type, phone, qty } = req.body;
    if (!participant_id || !vote_type || !phone) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    const voteQty = Number.isInteger(qty) && qty >= 1 ? qty : 1;
    if (vote_type !== 'star' && vote_type !== 'heart') {
      return res.status(400).json({ error: 'INVALID_VOTE_TYPE' });
    }
    /*DKDK_VOTE_AMT*/
    const amount = (vote_type === 'heart' ? 200 : 100) * voteQty;
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();
    /*DKDK_VOTE_OP_FIX*/
    const result = await initiatePayment({
      amount,
      phone,
      operator: 'mtn',
      userId,
      userEmail: user?.email || 'fan@dkdk.com',
      firstName: user?.first_name || 'Fan',
      lastName:  user?.last_name  || 'DKDK',
    });
    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id:    userId,
        type:       'vote',
        amount,
        net_amount: amount,
        phone,
        ref:        String(result.transactionId),
        status:     'pending',
        /*DKDK_VOTE_META*/
        metadata:   { participant_id, p_type: vote_type, qty: voteQty },
      });
    if (txErr) return res.status(500).json({ error: 'TX_INSERT_FAILED', detail: txErr.message });
    return res.status(200).json({ success: true, paymentUrl: result.paymentUrl });
  } catch (err: any) {
    return res.status(500).json({ error: 'VOTE_PAYMENT_FAILED' });
  }
}

// ─── WEBHOOK FEDAPAY ─────────────────────────────────────────
export async function webhook(req: Request, res: Response) { /*DKDK_WEBHOOK_VOTE*/
  try {
    const { transaction_id, status } = req.body;
    if (status === 'approved') {
      const payment = await verifyPayment(transaction_id);
      if (payment.approved) {
        const { data: tx } = await supabase
          .from('transactions')
          .select('id, user_id, amount, type, metadata, status')
          .eq('ref', String(transaction_id))
          .single();
        if (tx && tx.status !== 'success') {
          // Crediter le wallet du montant paye (flux unifie)
          await supabase.rpc('credit_wallet', {
            p_user_id: tx.user_id,
            p_amount:  tx.amount,
          });
          if (tx.type === 'vote' && tx.metadata) {
            // Vote paye directement : le RPC va debiter ce credit et enregistrer le vote
            await supabase.rpc('vote_bracket_pool', {
              p_user_id:        tx.user_id,
              p_participant_id: tx.metadata.participant_id,
              /*DKDK_WEBHOOK_QTY*/
              p_qty:            tx.metadata.qty ?? 1,
              p_type:           tx.metadata.p_type,
            });
          }
          // Marquer la transaction comme reussie
          await supabase
            .from('transactions')
            .update({ status: 'success' })
            .eq('id', tx.id);
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch {
    return res.status(500).json({ error: 'WEBHOOK_FAILED' });
  }
}

// ─── RETRAIT Mobile Money ─────────────────────────────────────
export async function withdraw(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { amount, phone, operator } = req.body;

    // 1. Validation
    if (!amount || !phone || !operator) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    if (amount < MIN_RETRAIT || amount > MAX_RETRAIT) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: `Le montant doit être entre ${MIN_RETRAIT} et ${MAX_RETRAIT} F CFA`,
      });
    }

    // 2. Vérifier le solde
    const { data: user } = await supabase
      .from('users')
      .select('wallet, first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    if ((user.wallet ?? 0) < amount) {
      return res.status(400).json({
        error: 'INSUFFICIENT_BALANCE',
        message: 'Solde insuffisant pour ce retrait',
      });
    }

    // 3. Déduire le montant du wallet AVANT d'envoyer (évite double retrait)
    const { error: debitError } = await supabase
      .from('users')
      .update({ wallet: (user.wallet ?? 0) - amount })
      .eq('id', userId);

    if (debitError) return res.status(500).json({ error: 'DEBIT_FAILED' });

    // 4. Enregistrer la transaction en attente
    const { data: tx } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        type:    'retrait',
        status:  'pending',
        operator,
        phone,
      })
      .select()
      .single();

    // 5. Lancer le payout FedaPay
    try {
      const result = await withdrawPayment({
        amount,
        phone,
        operator,
        userId,
        firstName: user.first_name || 'User',
        lastName:  user.last_name  || 'DKDK',
      });

      // 6. Mettre à jour la transaction avec l'ID FedaPay
      await supabase
        .from('transactions')
        .update({ fedapay_id: String(result.payoutId), status: 'sent' })
        .eq('id', tx?.id);

      return res.status(200).json({
        success:   true,
        message:   'Retrait initié avec succès',
        netAmount: result.netAmount,
        frais:     result.frais,
        payoutId:  result.payoutId,
      });

    } catch (fedaErr: any) {
      // Rembourser le wallet si FedaPay échoue
      await supabase
        .from('users')
        .update({ wallet: user.wallet })
        .eq('id', userId);

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx?.id);

      return res.status(502).json({
        error:   'PAYOUT_FAILED',
        message: 'Le virement a échoué. Votre solde a été restauré.',
      });
    }

  } catch {
    return res.status(500).json({ error: 'WITHDRAW_FAILED' });
  }
}