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
const FRAIS_RATE = 0.02; // 2% frais retrait

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
  const frais     = Math.ceil(params.amount * FRAIS_RATE);
  const netAmount = params.amount - frais;

  const response = await axios.post(
    `${FEDAPAY_API}/payouts`,
    {
      description: `Retrait Diki-Diki — ${netAmount} F CFA`,
      amount:      netAmount,
      currency:    { iso: 'XOF' },
      mode:        params.operator, // 'mtn', 'orange', 'wave', 'moov'
      customer: {
        firstname:    params.firstName,
        lastname:     params.lastName,
        phone_number: { number: params.phone, country: _fedaCountry(params.phone) },
      },
    },
    { headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' } }
  );

  const payout = response.data['v1/payout'];

  // Déclencher le payout immédiatement
  await axios.put(
    `${FEDAPAY_API}/payouts/${payout.id}/send_now`,
    {},
    { headers: { Authorization: `Bearer ${SECRET_KEY}` } }
  );

  return {
    payoutId:  payout.id,
    netAmount,
    frais,
    status:    payout.status,
  };
}