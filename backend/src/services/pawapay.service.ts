// ────────────────────────────────────────────────────────────────────────────
// PawaPay — décaissements (payouts) Mobile Money, API v2.
// Doc : POST /v2/payouts, GET /v2/payouts/{id}, callback POST vers notre URL.
// Auth : Authorization: Bearer <PAWAPAY_TOKEN>.
// Sandbox : https://api.sandbox.pawapay.io — Prod : https://api.pawapay.io.
// Le token vit dans l'env Railway (PAWAPAY_TOKEN), JAMAIS dans le code.
// ────────────────────────────────────────────────────────────────────────────
import axios from 'axios';
import * as crypto from 'crypto';

const PAWAPAY_BASE = process.env.PAWAPAY_ENV === 'production'
  ? 'https://api.pawapay.io'
  : 'https://api.sandbox.pawapay.io';
const PAWAPAY_TOKEN = process.env.PAWAPAY_TOKEN || '';

function _headers() {
  return { Authorization: `Bearer ${PAWAPAY_TOKEN}`, 'Content-Type': 'application/json' };
}

// MSISDN attendu par PawaPay : chiffres uniquement, indicatif pays inclus, sans '+'.
export function sanitizeMsisdn(phone?: string): string {
  return String(phone || '').replace(/[^0-9]/g, '');
}

// (pays ISO2 → opérateur interne → code "provider"/correspondent PawaPay v2).
// Seuls les 10 marchés self-service + cross-border OK (cf. DIKI-operateurs-retrait.md).
const PAWA_PROVIDERS: Record<string, Record<string, string>> = {
  CM: { mtn: 'MTN_MOMO_CMR', orange: 'ORANGE_CMR' },
  CG: { mtn: 'MTN_MOMO_COG', airtel: 'AIRTEL_COG' },
  GA: { airtel: 'AIRTEL_GAB' },
  CD: { vodacom: 'VODACOM_MPESA_COD', airtel: 'AIRTEL_COD', orange: 'ORANGE_COD' },
  KE: { mpesa: 'MPESA_KEN' },
  RW: { mtn: 'MTN_MOMO_RWA', airtel: 'AIRTEL_RWA' },
  SL: { orange: 'ORANGE_SLE' },
  TZ: { airtel: 'AIRTEL_TZA', vodacom: 'VODACOM_TZA', tigo: 'TIGO_TZA', halotel: 'HALOTEL_TZA' },
  UG: { airtel: 'AIRTEL_OAPI_UGA', mtn: 'MTN_MOMO_UGA' },
  ZM: { airtel: 'AIRTEL_OAPI_ZMB', mtn: 'MTN_MOMO_ZMB', zamtel: 'ZAMTEL_ZMB' },
};
export function pawaProvider(countryIso?: string, operator?: string): string {
  const c = String(countryIso || '').toUpperCase();
  const op = String(operator || '').toLowerCase();
  return (PAWA_PROVIDERS[c] && PAWA_PROVIDERS[c][op]) || '';
}

// Crée un payout. amount = entier (envoyé en string), currency ISO, provider = code correspondant.
// Réponse v2 : { payoutId, status: 'ACCEPTED'|'REJECTED'|'DUPLICATE_IGNORED', created }.
export async function pawapayPayout(params: {
  amount:   number;
  currency: string;
  phone:    string;
  provider: string;
}) {
  const payoutId = crypto.randomUUID();
  const body = {
    payoutId,
    amount:   String(params.amount),
    currency: params.currency,
    recipient: {
      type: 'MMO',
      accountDetails: {
        phoneNumber: sanitizeMsisdn(params.phone),
        provider:    params.provider,
      },
    },
  };
  const res = await axios.post(`${PAWAPAY_BASE}/v2/payouts`, body, { headers: _headers() });
  return { payoutId, status: res.data?.status, raw: res.data };
}

// Statut réel d'un payout (source de vérité). status: COMPLETED | FAILED | PROCESSING | ENQUEUED | ...
export async function pawapayStatus(payoutId: string) {
  const res = await axios.get(`${PAWAPAY_BASE}/v2/payouts/${payoutId}`, { headers: _headers() });
  return res.data;
}
