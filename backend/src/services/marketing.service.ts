// backend/src/services/marketing.service.ts
// Conversions serveur-à-serveur (Purchase) vers TikTok Events API + Meta CAPI.
// 100% ADDITIF et NON-BLOQUANT : ne renvoie jamais d'erreur, n'attend rien de
// bloquant côté webhook. Piloté par variables d'environnement ; si les jetons
// ne sont pas définis, la fonction ne fait rien (no-op).
//
// Variables d'env (Railway) :
//   META_PIXEL_ID, META_CAPI_TOKEN            (Meta Conversions API)
//   TIKTOK_PIXEL_ID, TIKTOK_EVENTS_TOKEN      (TikTok Events API)
//
// L'event_id = référence de la transaction : il permet la déduplication avec
// le pixel navigateur (pas de double comptage si les deux se déclenchent).

import { createHash } from 'crypto';

function sha256(v: string): string {
  return createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
}

async function postMetaCapi(userId: string, value: number, currency: string, eventId: string) {
  const pid = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pid || !token) return;
  const url = `https://graph.facebook.com/v19.0/${pid}/events?access_token=${encodeURIComponent(token)}`;
  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: { external_id: [sha256(userId)] },
      custom_data: { currency, value },
    }],
  };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function postTikTokEvents(userId: string, value: number, currency: string, eventId: string) {
  const pid = process.env.TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_TOKEN;
  if (!pid || !token) return;
  const url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';
  const body = {
    event_source: 'web',
    event_source_id: pid,
    data: [{
      event: 'CompletePayment',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      user: { external_id: sha256(userId) },
      properties: { currency, value },
    }],
  };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': token },
    body: JSON.stringify(body),
  });
}

/**
 * Envoie l'événement d'achat (recharge / paiement réel) aux régies.
 * Ne jette JAMAIS : à appeler en fire-and-forget depuis le webhook.
 */
export async function sendServerPurchase(params: {
  userId: string; value: number; currency?: string; ref: string;
}): Promise<void> {
  try {
    const { userId, value, ref } = params;
    const currency = params.currency || 'XOF';
    if (!userId || !ref || !(value > 0)) return;
    // Les deux appels sont indépendants ; une panne de l'un n'empêche pas l'autre.
    await Promise.allSettled([
      postMetaCapi(userId, value, currency, ref),
      postTikTokEvents(userId, value, currency, ref),
    ]);
  } catch {
    /* silencieux : le marketing ne doit jamais impacter le paiement */
  }
}
