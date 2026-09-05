import * as _dkdkCrypto from 'crypto'; /*DKDK_SIG_OBSERVE*/
import { Request, Response } from 'express';
import { initiatePayment, verifyPayment, withdrawPayment, paymentProvider, retraitRule, retraitFee } from '../services/payment.service';
import { pawaProvider, pawapayPayout, pawapayStatus } from '../services/pawapay.service';
import { supabase } from '../../config/supabase';

const MIN_RETRAIT = 500; /*DKDK_MIN_RETRAIT_500*/
const MAX_RETRAIT = 2000000;

/*DKDK_PAYMENT_WALLET_FIX*/
// Decoupe "name" (colonne reelle de public.users) en prenom/nom,
// pour remplacer first_name/last_name qui n'existent pas.
function splitName(fullName?: string, fallbackFirst?: string, fallbackLast?: string) {
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

    /*DKDK_RECHARGE_TX*/
    const { error: _rcErr } = await supabase
      .from('transactions')
      .insert({
        user_id:    userId,
        type:       'credit',
        amount,
        net_amount: amount,
        phone,
        operator,
        ref:        String(result.transactionId),
        status:     'pending',
      });
    if (_rcErr) return res.status(500).json({ error: 'TX_INSERT_FAILED', detail: _rcErr.message });
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
    let _prixEtoile = 100, _prixCoeur = 200; /*DKDK_PRIX_SETTINGS*/
    try {
      const { data: _stx } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['bracket_vote_amount', 'bracket_heart_amount']);
      for (const _s of (_stx || []) as any[]) {
        const _v = Number(_s.value);
        if (_s.key === 'bracket_vote_amount' && Number.isFinite(_v) && _v > 0) _prixEtoile = _v;
        if (_s.key === 'bracket_heart_amount' && Number.isFinite(_v) && _v > 0) _prixCoeur = _v;
      }
    } catch {}
    const amount = (vote_type === 'heart' ? _prixCoeur : _prixEtoile) * voteQty;
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
    /*DKDK_WEBHOOK_SIGLOG*/
    // OBSERVATION signature FedaPay (ne bloque rien).
    // But : voir le format REEL de la signature dans les logs Railway,
    // pour coder la verification ensuite sans deviner.
    try {
      const _h: any = req.headers || {};
      const _sig = _h['x-fedapay-signature'] || _h['X-FEDAPAY-SIGNATURE'] || null;
      const _rawLen = (req as any).rawBody ? (req as any).rawBody.length : 0;
      const _evName = (req.body && (req.body.name || req.body.event)) || '(inconnu)';
      console.log('[FEDAPAY_WEBHOOK] event=' + _evName + ' | signature=' + (_sig ? String(_sig) : '(absente)') + ' | rawBodyLen=' + _rawLen);
      // On journalise aussi la liste des en-tetes recus (noms uniquement) pour reference.
      console.log('[FEDAPAY_WEBHOOK] headers=' + Object.keys(_h).join(','));

      // ---- OBSERVATION HMAC : on teste 3 formules, on ne bloque rien. ----
      try {
        const _secret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
        const _raw = (req as any).rawBody ? String((req as any).rawBody) : '';
        const _sigStr = _sig ? String(_sig) : '';
        if (!_secret) {
          console.log('[DKDK_SIG] FEDAPAY_WEBHOOK_SECRET absente de l environnement');
        } else if (!_sigStr || !_raw) {
          console.log('[DKDK_SIG] signature ou rawBody manquant (sig=' + (_sigStr ? 'oui' : 'non') + ', raw=' + _raw.length + ')');
        } else {
          // Decoupage de l en-tete : t=<timestamp>,s=<hmac>
          let _t = '';
          let _s = '';
          const _parts = _sigStr.split(',');
          for (let _i = 0; _i < _parts.length; _i++) {
            const _kv = _parts[_i].trim();
            if (_kv.indexOf('t=') === 0) _t = _kv.substring(2);
            if (_kv.indexOf('s=') === 0) _s = _kv.substring(2);
          }
          function _hmac(payload: string) {
            return _dkdkCrypto.createHmac('sha256', _secret).update(payload, 'utf8').digest('hex');
          }
          const _A = _hmac(_t + '.' + _raw);
          const _B = _hmac(_raw);
          const _C = _hmac(_t + _raw);
          let _match = 'AUCUNE';
          if (_s === _A) _match = 'A (t + . + rawBody)';
          else if (_s === _B) _match = 'B (rawBody seul)';
          else if (_s === _C) _match = 'C (t + rawBody)';
          console.log('[DKDK_SIG] t=' + _t + ' | recue=' + _s.substring(0, 16) + '...');
          console.log('[DKDK_SIG] A=' + _A.substring(0, 16) + '... B=' + _B.substring(0, 16) + '... C=' + _C.substring(0, 16) + '...');
          console.log('[DKDK_SIG] >>> FORMULE CORRESPONDANTE : ' + _match);
        }
      } catch (_sigErr: any) {
        console.log('[DKDK_SIG] erreur observation : ' + (_sigErr && _sigErr.message));
      }
      // ---- Fin observation. Le webhook continue normalement. ----
    } catch (_logErr) {
      // La journalisation ne doit jamais faire echouer le webhook.
    }
    /*DKDK_SIG_ENFORCE*/
    // ---- VERIFICATION STRICTE DE LA SIGNATURE FEDAPAY ----
    // Formule confirmee par observation : HMAC-SHA256(secret, t + "." + rawBody)
    // Un webhook mal signe est rejete AVANT tout traitement (aucun credit possible).
    {
      const _vSecret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
      if (!_vSecret) {
        console.log('[DKDK_SIG] REFUS : FEDAPAY_WEBHOOK_SECRET absente');
        return res.status(500).json({ error: 'WEBHOOK_SECRET_MISSING' });
      }
      const _vHeaders: any = req.headers || {};
      const _vSigRaw = _vHeaders['x-fedapay-signature'] || _vHeaders['X-FEDAPAY-SIGNATURE'] || '';
      const _vRaw = (req as any).rawBody ? String((req as any).rawBody) : '';
      if (!_vSigRaw || !_vRaw) {
        console.log('[DKDK_SIG] REFUS : signature ou corps brut manquant');
        return res.status(401).json({ error: 'INVALID_SIGNATURE' });
      }
      // Decoupage de l en-tete : t=<timestamp>,s=<hmac>
      let _vT = '';
      let _vS = '';
      const _vParts = String(_vSigRaw).split(',');
      for (let _vi = 0; _vi < _vParts.length; _vi++) {
        const _vkv = _vParts[_vi].trim();
        if (_vkv.indexOf('t=') === 0) _vT = _vkv.substring(2);
        if (_vkv.indexOf('s=') === 0) _vS = _vkv.substring(2);
      }
      if (!_vT || !_vS) {
        console.log('[DKDK_SIG] REFUS : format de signature inattendu');
        return res.status(401).json({ error: 'INVALID_SIGNATURE' });
      }
      // Anti-rejeu : tolerance de 5 minutes sur l horodatage.
      const _vAge = Math.abs(Math.floor(Date.now() / 1000) - Number(_vT));
      if (!Number.isFinite(_vAge) || _vAge > 300) {
        console.log('[DKDK_SIG] REFUS : horodatage hors tolerance (age=' + _vAge + 's)');
        return res.status(401).json({ error: 'SIGNATURE_EXPIRED' });
      }
      // Calcul HMAC et comparaison en temps constant.
      const _vExpected = _dkdkCrypto.createHmac('sha256', _vSecret).update(_vT + '.' + _vRaw, 'utf8').digest('hex');
      let _vOk = false;
      try {
        const _vBufA = Buffer.from(_vExpected, 'utf8');
        const _vBufB = Buffer.from(_vS, 'utf8');
        _vOk = _vBufA.length === _vBufB.length && _dkdkCrypto.timingSafeEqual(_vBufA, _vBufB);
      } catch (_vCmpErr) {
        _vOk = false;
      }
      if (!_vOk) {
        console.log('[DKDK_SIG] REFUS : signature invalide');
        return res.status(401).json({ error: 'INVALID_SIGNATURE' });
      }
      console.log('[DKDK_SIG] OK : signature valide');
    }
    // ---- Fin verification. Webhook authentifie. ----
    /*DKDK_WEBHOOK_PAYOUT_V3*/
    // ---- RETRAITS (payout) : confirmation reussite / echec ----
    // FedaPay envoie des evenements payout.* : payout.created, payout.failed,
    // payout.sent / payout.succeeded... On lit le statut REEL de l'entite
    // (entity.status) et on met a jour l'etiquette de NOTRE transaction.
    // On ne touche JAMAIS d'argent ici. Un payout 'failed' redonne le solde
    // retirable (car un 'failed' n'est pas compte comme retrait engage).
    {
      const _b: any = req.body || {};
      const _event = String(_b.name || _b.event || '').toLowerCase();
      const _obj: any = _b.entity || _b.data || {};
      const _objType = String(_b.object || _obj.object || '').toLowerCase();
      const _fedaId = _obj.id || _b.object_id || _b.transaction_id || null;
      const _isPayout = _event.indexOf('payout.') === 0 || _objType === 'payout';
      if (_isPayout && _fedaId) {
        const _pStatus = String(_obj.status || '').toLowerCase();
        let _newStatus: string | null = null;
        if (_pStatus === 'sent' || _pStatus === 'succeeded' || _pStatus === 'success' || _pStatus === 'transferred') {
          _newStatus = 'success';
        } else if (_pStatus === 'failed' || _pStatus === 'canceled' || _pStatus === 'cancelled') {
          _newStatus = 'failed';
        } else if (_event.indexOf('payout.failed') !== -1 || _event.indexOf('payout.canceled') !== -1) {
          _newStatus = 'failed';
        } else if (_event.indexOf('payout.sent') !== -1 || _event.indexOf('payout.succeeded') !== -1) {
          _newStatus = 'success';
        }
        if (_newStatus) {
          const _errMsg = _obj.last_error_message ? String(_obj.last_error_message).substring(0, 300) : '';
          console.log('[WEBHOOK_PAYOUT] id=' + _fedaId + ' | statut_feda=' + _pStatus + ' -> ' + _newStatus + (_errMsg ? ' | erreur=' + _errMsg : ''));
          const { data: _ptx } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('fedapay_id', String(_fedaId))
            .eq('type', 'payout')
            .maybeSingle();
          if (_ptx && _ptx.status !== 'success' && _ptx.status !== 'failed') {
            await supabase
              .from('transactions')
              .update({ status: _newStatus })
              .eq('id', _ptx.id);
          }
          return res.status(200).json({ received: true, payout: _newStatus });
        }
        // Evenement payout non terminal (created, processing) : on acquitte sans rien changer.
        console.log('[WEBHOOK_PAYOUT] id=' + _fedaId + ' | statut_feda=' + (_pStatus || 'inconnu') + ' (non terminal, ignore)');
        return res.status(200).json({ received: true, payout: _pStatus || 'pending' });
      }
    }
    // ---- Fin bloc retraits. En dessous : traitement de l'argent entrant. ----
    /*DKDK_WEBHOOK_APPROVED*/
    // FedaPay envoie { name: "transaction.approved", entity: { id: ... } }
    // et NON { status, transaction_id }. Confirme par les logs Railway.
    const _wb: any = req.body || {};
    const _wEvent = String(_wb.name || _wb.event || '').toLowerCase();
    const _wEntity: any = _wb.entity || _wb.object || _wb.data || {};
    const transaction_id = String(_wEntity.id || _wb.transaction_id || _wb.id || '');
    const _wIsApproved = _wEvent.indexOf('transaction.approved') !== -1;
    if (_wIsApproved && transaction_id) {
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
    // Pays + regle de devise (minimum et frais). country absent => ancien flux Benin (XOF).
    const _country = String((req.body && req.body.country) || 'BJ').toUpperCase();
    const _rule = retraitRule(_country);
    // 1. Validation
    if (!amount || !phone || !operator) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    if (amount < _rule.min || amount > MAX_RETRAIT) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'Le montant doit etre entre ' + _rule.min + ' et ' + MAX_RETRAIT + ' ' + _rule.currency,
      });
    }
    // 2. Recuperer le nom (pour le prestataire)
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
      .in('type', ['bracket_win', 'soutien_gain'])
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
    // 5. Lancer le payout selon le prestataire (FedaPay francophone / PawaPay le reste)
    const _provider = paymentProvider(_country);
    const _fee = retraitFee(_country, amount);
    const _net = amount - _fee;
    try {
      let _payoutId = '';
      if (_provider === 'pawapay') {
        const _prov = pawaProvider(_country, operator);
        if (!_prov) {
          await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx?.id);
          return res.status(400).json({ error: 'OPERATOR_NOT_SUPPORTED', message: 'Operateur non pris en charge pour ce pays.' });
        }
        const pres = await pawapayPayout({ amount: _net, currency: _rule.currency, phone, provider: _prov });
        if (String(pres.status || '').toUpperCase() !== 'ACCEPTED') {
          throw new Error('PAWAPAY_' + (pres.status || 'REJECTED') + ' | ' + JSON.stringify(pres.raw || {}));
        }
        _payoutId = String(pres.payoutId);
      } else {
        var _wNames = splitName(user.name);
        const result = await withdrawPayment({
          amount, phone, operator, userId,
          firstName: _wNames.firstName, lastName: _wNames.lastName, country: _country,
        });
        _payoutId = String(result.payoutId);
      }
      // 6. Mettre a jour la transaction avec l'ID du prestataire + statut 'sent'
      await supabase
        .from('transactions')
        .update({ fedapay_id: _payoutId, status: 'sent' })
        .eq('id', tx?.id);
      return res.status(200).json({
        success:   true,
        message:   'Retrait initie avec succes',
        netAmount: _net,
        frais:     _fee,
        payoutId:  _payoutId,
      });
    } catch (payErr: any) {
      /*DKDK_LOG_PAYOUT_FAIL — on journalise la vraie raison (sinon impossible a diagnostiquer)*/
      try {
        const _st = payErr?.response?.status;
        const _body = payErr?.response?.data ? JSON.stringify(payErr.response.data) : (payErr?.message || 'inconnue');
        console.error('[WITHDRAW] Echec payout ' + _provider + ' | status=' + _st + ' | detail=' + _body);
      } catch (_logErr) { /* la journalisation ne doit jamais casser la reponse */ }
      // Echec : transaction 'failed'. Un payout failed n'est PAS soustrait du solde -> gains redeviennent dispo.
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx?.id);
      return res.status(502).json({
        error:   'PAYOUT_FAILED',
        message: 'Le virement a echoue. Vos gains restent disponibles.',
      });
    }
  } catch {
    return res.status(500).json({ error: 'WITHDRAW_FAILED' });
  }
}

// ─── CALLBACK PawaPay (statut d'un payout) ───────────────────────────────────
// PawaPay POST sur cette URL avec { payoutId, status, ... }. On ne fait PAS
// confiance au corps : on redemande le vrai statut a PawaPay (GET /v2/payouts/{id}),
// puis on met a jour NOTRE transaction. On ne touche jamais d'argent ici.
// Un payout 'failed' redonne le solde retirable (car un 'failed' n'est pas compte).
export async function pawapayCallback(req: Request, res: Response) {
  try {
    const _b: any = req.body || {};
    const _payoutId = String(_b.payoutId || _b.payout_id || '');
    if (!_payoutId) return res.status(200).json({ received: true });

    // Statut authentifie : on interroge PawaPay directement (jamais confiance au corps brut).
    let _status = String(_b.status || '').toUpperCase();
    try {
      const s = await pawapayStatus(_payoutId);
      if (s && s.status) _status = String(s.status).toUpperCase();
    } catch (_e) { /* si l'appel echoue, on retombe sur le statut du corps */ }

    let _newStatus: string | null = null;
    if (_status === 'COMPLETED') _newStatus = 'success';
    else if (_status === 'FAILED' || _status === 'REJECTED' || _status === 'CANCELLED') _newStatus = 'failed';
    // PROCESSING / ENQUEUED / IN_RECONCILIATION : non terminal -> on attend.

    if (_newStatus) {
      console.log('[PAWAPAY_CB] payoutId=' + _payoutId + ' | statut=' + _status + ' -> ' + _newStatus);
      const { data: _ptx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('fedapay_id', _payoutId)
        .eq('type', 'payout')
        .maybeSingle();
      if (_ptx && _ptx.status !== 'success' && _ptx.status !== 'failed') {
        await supabase.from('transactions').update({ status: _newStatus }).eq('id', _ptx.id);
      }
    } else {
      console.log('[PAWAPAY_CB] payoutId=' + _payoutId + ' | statut=' + _status + ' (non terminal, ignore)');
    }
    // Toujours 200 pour eviter que PawaPay re-essaie en boucle.
    return res.status(200).json({ received: true });
  } catch {
    return res.status(200).json({ received: true });
  }
}

// ─── TEST sandbox PawaPay (ADMIN) ────────────────────────────────────────────
// Declenche un payout de test avec des donnees fournies (numero de test PawaPay),
// SANS toucher au solde d'un candidat. Sert a valider l'integration en sandbox.
export async function pawapayTest(req: Request, res: Response) {
  try {
    const { amount, country, operator, phone } = req.body || {};
    const iso = String(country || '').toUpperCase();
    const _prov = pawaProvider(iso, operator);
    if (!_prov) return res.status(400).json({ error: 'BAD_PROVIDER', message: 'country/operator invalides pour PawaPay' });
    const _rule = retraitRule(iso);
    const r = await pawapayPayout({
      amount:   Number(amount) || 100,
      currency: _rule.currency,
      phone:    String(phone || ''),
      provider: _prov,
    });
    return res.status(200).json({ ok: true, provider: _prov, currency: _rule.currency, ...r });
  } catch (e: any) {
    return res.status(500).json({
      error:  'PAWA_TEST_FAILED',
      status: e?.response?.status,
      detail: e?.response?.data || e?.message,
    });
  }
}