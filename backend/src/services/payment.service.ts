import axios from 'axios';

const FEDAPAY_API = process.env.NODE_ENV === 'production'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

const SECRET_KEY = process.env.FEDAPAY_SECRET_KEY!;

/*DKDK_FEDA_COUNTRY*/
function _fedaCountry(phone?: string): string {
  const s = String(phone || '').trim();
  if (!s.startsWith('+')) return 'BJ';
  const digits = s.replace(/[^0-9]/g, '');
  const MAP: Record<string, string> = { '229':'BJ','225':'CI','228':'TG','221':'SN','227':'NE','223':'ML','226':'BF','245':'GW' };
  for (const ind of Object.keys(MAP)) if (digits.startsWith(ind)) return MAP[ind];
  return 'BJ';
}
// Frais FIXES FedaPay par decaissement (fixed_commission = 150 F pour MoMo Benin),
// a la charge du CANDIDAT qui retire (champion ou elimine), JAMAIS de la plateforme.
// Le candidat recoit (montant - FRAIS_FIXE) ; FedaPay debite montant du solde marchand.
// (Doit egaler FRAIS_FIXE cote frontend retrait/page.tsx.)
const FRAIS_FIXE = 150;

/*DKDK_FEDA_MODE — FedaPay attend des codes de mode precis pour les payouts Mobile Money,
  differents de nos etiquettes ('mtn','moov'...). Ex. MTN Benin = 'mtn_open', Moov Benin = 'moov'. */
function _fedaMode(operator?: string, phone?: string): string {
  const op = String(operator || '').toLowerCase();
  const country = _fedaCountry(phone);
  if (country === 'BJ') {
    if (op === 'mtn')  return 'mtn_open';
    if (op === 'moov') return 'moov';
  }
  if (country === 'CI') {
    if (op === 'mtn')    return 'mtn_ci';
    if (op === 'moov')   return 'moov_ci';
    if (op === 'wave')   return 'wave_ci';
    if (op === 'orange') return 'orange_ci';
  }
  if (country === 'TG' && op === 'moov') return 'moov_tg';
  if (country === 'SN') {
    if (op === 'wave')   return 'wave_sn';
    if (op === 'orange') return 'orange_sn';
  }
  return op; // repli : on renvoie l'etiquette telle quelle
}

// ─── INITIER UN PAIEMENT (recharge) ─────────────────────────
export async function initiatePayment(params: {
  amount:    number;
  phone:     string;
  operator:  string;
  userId:    string;
  userEmail: string;
  firstName: string;
  lastName:  string;
}) {
  const response = await axios.post(
    `${FEDAPAY_API}/transactions`,
    {
      description:  `Recharge Diki-Diki — ${params.amount} F CFA`,
      amount:       params.amount,
      currency:     { iso: 'XOF' },
      callback_url: process.env.FEDAPAY_CALLBACK_URL || 'http://localhost:3000/payment/callback',
      customer: {
        email:        params.userEmail,
        firstname:    params.firstName,
        lastname:     params.lastName,
        phone_number: { number: params.phone, country: _fedaCountry(params.phone) },
      },
    },
    { headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );

  /*DKDK_FEDA_FIX*/ const transaction = response.data['v1/transaction'];

  const tokenRes = await axios.post(
    `${FEDAPAY_API}/transactions/${transaction.id}/token`,
    {},
    { headers: { Authorization: `Bearer ${SECRET_KEY}` } }
  );

  return {
    transactionId: transaction.id,
    paymentUrl:    tokenRes.data.url,
  };
}

// ─── VÉRIFIER UN PAIEMENT ───────────────────────────────────
export async function verifyPayment(transactionId: string) {
  const response = await axios.get(
    `${FEDAPAY_API}/transactions/${transactionId}`,
    { headers: { Authorization: `Bearer ${SECRET_KEY}` } }
  );
  /*DKDK_FEDA_FIX2*/ const transaction = response.data['v1/transaction'];
  return {
    status:   transaction.status,
    amount:   transaction.amount,
    approved: transaction.status === 'approved',
  };
}

// ─── INITIER UN RETRAIT (payout) ────────────────────────────
export async function withdrawPayment(params: {
  amount:    number;
  phone:     string;
  operator:  string;
  userId:    string;
  firstName: string;
  lastName:  string;
}) {
  const frais     = FRAIS_FIXE;
  const netAmount = params.amount - frais;

  const response = await axios.post(
    `${FEDAPAY_API}/payouts`,
    {
      description: `Retrait Diki-Diki — ${netAmount} F CFA`,
      amount:      netAmount,
      currency:    { iso: 'XOF' },
      mode:        _fedaMode(params.operator, params.phone), // FedaPay: 'mtn_open', 'moov'...
      customer: {
        firstname:    params.firstName,
        lastname:     params.lastName,
        phone_number: { number: params.phone, country: _fedaCountry(params.phone) },
      },
    },
    { headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );

  const payout = response.data['v1/payout'];

  // Déclencher le payout immédiatement — FedaPay: PUT /v1/payouts/start
  // IMPORTANT: PAS de scheduled_at => envoi immediat. Le mot 'now' litteral etait
  // rejete par FedaPay (INVALID_PARAMS: scheduled_at invalid_datetime).
  await axios.put(
    `${FEDAPAY_API}/payouts/start`,
    { payouts: [{ id: payout.id }] },
    { headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );

  return {
    payoutId:  payout.id,
    netAmount,
    frais,
    status:    payout.status,
  };
}