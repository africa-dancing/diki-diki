import { Request, Response } from 'express';
import { initiatePayment, verifyPayment, withdrawPayment } from '../services/payment.service';
import { supabase } from '../../config/supabase';

const MIN_RETRAIT = 5000;
const MAX_RETRAIT = 2000000;

/*DKDK_PAYMENT_WALLET_FIX*/
// Decoupe "name" (colonne reelle de public.users) en prenom/nom,
// pour remplacer first_name/last_name qui n'existent pas.
function splitName(fullName, fallbackFirst, fallbackLast) {
  var fbFirst = fallbackFirst || 'User';
  var fbLast  = fallbackLast  || 'DKDK';
  if (!fullName || !fullName.trim()) return { firstName: fbFirst, lastName: fbLast };
  var parts = fullName.trim().split(/\s+/);
  var firstName = parts[0];
  var lastName = parts.length > 1 ? parts.slice(1).join(' ') : fbLast;
  return { firstName: firstName, lastName: lastName };
}

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
      .select('email, name')
      .eq('id', userId)
      .single();

    var _names = splitName(user?.name);

    const result = await initiatePayment({
      amount,
      phone,
      operator,
      userId,
      userEmail: user?.email || 'user@dkdk.com',
      firstName: _names.firstName,
      lastName:  _names.lastName,
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
      .select('email, name')
      .eq('id', userId)
      .single();
    /*DKDK_VOTE_OP_FIX*/
    var _fanNames = splitName(user?.name, 'Fan', 'DKDK');
    const result = await initiatePayment({
      amount,
      phone,
      operator: 'mtn',
      userId,
      userEmail: user?.email || 'fan@dkdk.com',
      firstName: _fanNames.firstName,
      lastName:  _fanNames.lastName,
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
    /*DKDK_WEBHOOK_PAYOUT*/
    // ---- RETRAITS (payouts) : confirmation reussite / echec ----
    // FedaPay rappelle ce webhook quand un virement sortant evolue.
    // On ne fait que mettre a jour une etiquette de statut, jamais d'argent.
    {
      const _b: any = req.body || {};
      // Nom de l'evenement (formes possibles selon FedaPay)
      const _event = String(_b.name || _b.event || _b.type || '');
      const _isPayoutEvent = _event.toLowerCase().indexOf('payout') !== -1;
      // Identifiant du payout (forme selon FedaPay) et statut annonce
      const _entity = _b.entity || _b.data || _b.object || _b.payout || {};
      const _payoutId = _entity.id || _b.payout_id || _b.id || null;
      const _rawStatus = String(_entity.status || _b.status || '').toLowerCase();
      if (_isPayoutEvent && _payoutId) {
        // Retrouver la transaction payout par son fedapay_id
        const { data: _ptx } = await supabase
          .from('transactions')
          .select('id, type, status')
          .eq('fedapay_id', String(_payoutId))
          .eq('type', 'payout')
          .single();
        if (_ptx && _ptx.status !== 'success' && _ptx.status !== 'failed') {
          // Statuts consideres comme reussite / echec (formes courantes)
          const _ok = ['sent', 'approved', 'success', 'completed', 'done', 'paid'];
          const _ko = ['failed', 'declined', 'canceled', 'cancelled', 'refused', 'error'];
          let _newStatus: string | null = null;
          if (_ok.indexOf(_rawStatus) !== -1) _newStatus = 'success';
          else if (_ko.indexOf(_rawStatus) !== -1) _newStatus = 'failed';
          if (_newStatus) {
            await supabase
              .from('transactions')
              .update({ status: _newStatus })
              .eq('id', _ptx.id);
          }
          // Statut FedaPay non reconnu -> on ne touche a rien (prudence).
        }
        // On repond OK et on s'arrete la pour un evenement de retrait.
        return res.status(200).json({ received: true, payout: true });
      }
    }
    // ---- Fin bloc retraits. En dessous : traitement de l'argent entrant. ----
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
    /*DKDK_WITHDRAW_V2*/
    // 1. Validation
    if (!amount || !phone || !operator) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    if (amount < MIN_RETRAIT || amount > MAX_RETRAIT) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'Le montant doit etre entre ' + MIN_RETRAIT + ' et ' + MAX_RETRAIT + ' F CFA',
      });
    }
    // 2. Recuperer le nom (pour FedaPay)
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    // 3. Solde retirable calcule depuis transactions (JAMAIS wallets.balance)
    //    gains reels moins retraits deja engages (pending inclus = anti double-retrait)
    const { data: gains } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'bracket_win')
      .eq('status', 'success');
    const { data: retraits } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'payout')
      .in('status', ['pending', 'sent', 'success']);
    const totalGains = (gains || []).reduce(function (s, t) { return s + (t.amount || 0); }, 0);
    const totalRetraits = (retraits || []).reduce(function (s, t) { return s + (t.amount || 0); }, 0);
    const soldeRetirable = totalGains - totalRetraits;
    if (soldeRetirable < amount) {
      return res.status(400).json({
        error: 'INSUFFICIENT_BALANCE',
        message: 'Solde retirable insuffisant pour ce retrait',
      });
    }
    // 4. Enregistrer la transaction payout en attente (on ne touche PAS au wallet)
    const { data: tx } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        type:    'payout',
        status:  'pending',
        operator,
        phone,
      })
      .select()
      .single();
    // 5. Lancer le payout FedaPay
    try {
      var _wNames = splitName(user.name);
      const result = await withdrawPayment({
        amount,
        phone,
        operator,
        userId,
        firstName: _wNames.firstName,
        lastName:  _wNames.lastName,
      });
      // 6. Mettre a jour la transaction avec l'ID FedaPay
      await supabase
        .from('transactions')
        .update({ fedapay_id: String(result.payoutId), status: 'sent' })
        .eq('id', tx?.id);
      return res.status(200).json({
        success:   true,
        message:   'Retrait initie avec succes',
        netAmount: result.netAmount,
        frais:     result.frais,
        payoutId:  result.payoutId,
      });
    } catch (fedaErr: any) {
      // FedaPay a echoue : transaction marquee failed.
      // Un payout failed n'est PAS soustrait du solde -> gains redeviennent dispo.
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx?.id);
      return res.status(502).json({
        error:   'PAYOUT_FAILED',
        message: 'Le virement a echoue. Vos gains restent disponibles.',
      });
    }
  } catch {
    return res.status(500).json({ error: 'WITHDRAW_FAILED' });
  }
}