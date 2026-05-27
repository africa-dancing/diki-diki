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
      operator,
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

// ─── WEBHOOK FEDAPAY ─────────────────────────────────────────
export async function webhook(req: Request, res: Response) {
  try {
    const { transaction_id, status } = req.body;

    if (status === 'approved') {
      const payment = await verifyPayment(transaction_id);

      if (payment.approved) {
        // Récupérer la transaction en base pour retrouver l'userId
        const { data: tx } = await supabase
          .from('transactions')
          .select('user_id, amount')
          .eq('fedapay_id', transaction_id)
          .single();

        if (tx) {
          // Créditer le wallet
          await supabase.rpc('credit_wallet', {
            p_user_id: tx.user_id,
            p_amount:  tx.amount,
          });

          // Marquer la transaction comme approuvée
          await supabase
            .from('transactions')
            .update({ status: 'approved' })
            .eq('fedapay_id', transaction_id);
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