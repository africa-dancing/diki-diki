// backend/src/routes/message.routes.ts
// DKDK_MESSAGERIE — Messagerie interne texte (V1).
// Regles : on n'ecrit qu'a un CANDIDAT (ou en reponse a qui nous a ecrit).
// Securite : blocage, signalement, reglage "autoriser", anti-spam (20 nouveaux
// contacts / 24 h), detection de contournement (vote/paiement hors plateforme).
// Aucune logique d'argent : flux totalement separe des votes / de la cagnotte.
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const messageRouter = Router();

const BODY_MAX = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Detection de contournement : sollicitation de votes/paiement hors plateforme.
// On NE bloque PAS — on MARQUE (flagged) le message pour revue en moderation.
const SENSITIVE: RegExp[] = [
  /\b(mtn|moov|celtiis|flooz|momo|mobile\s*money)\b/i,
  /\bvote[s]?\s*(contre|pour)\s*vote[s]?\b/i,
  /\bhors[\s-]*(appli|application|plateforme|site|diki)\b/i,
  /\bpaie(r|z|s|ment)?\b/i,
  /\bwhats?app\b/i,
  /(\+?229[\s.\-]?)?([0-9][\s.\-]?){9,}/, // numeros longs / telephone
];
function scanSensitive(text: string): string | null {
  for (const re of SENSITIVE) { if (re.test(text)) return re.source.slice(0, 60); }
  return null;
}

async function isCandidate(userId: string): Promise<boolean> {
  const { data } = await supabase.from('bracket_participants').select('id').eq('user_id', userId).limit(1);
  return (data || []).length > 0;
}

async function blockedBetween(a: string, b: string): Promise<boolean> {
  const { data } = await supabase.from('message_blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);
  return (data || []).length > 0;
}

// ─── Boite de reception : liste des conversations ───────────────────────
messageRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const { data } = await supabase.from('messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order('created_at', { ascending: false }).limit(500);
    const msgs = data || [];
    const convo: Record<string, any> = {};
    for (const m of msgs as any[]) {
      const other = m.sender_id === me ? m.recipient_id : m.sender_id;
      if (!convo[other]) convo[other] = { user_id: other, last_body: m.body, last_at: m.created_at, unread: 0 };
      if (m.recipient_id === me && !m.read_at) convo[other].unread++;
    }
    const others = Object.keys(convo);
    if (others.length) {
      const { data: us } = await supabase.from('users').select('id, name').in('id', others);
      const nameById: Record<string, string> = {};
      for (const u of (us || []) as any[]) nameById[u.id] = u.name || 'Utilisateur';
      for (const o of others) convo[o].name = nameById[o] || 'Utilisateur';
    }
    const list = Object.values(convo).sort((a: any, b: any) => (a.last_at < b.last_at ? 1 : -1));
    return res.json({ success: true, data: list });
  } catch { return res.status(500).json({ error: 'INBOX_FAILED' }); }
});

// ─── Compteur de non-lus (pastille nav) ─────────────────────────────────
messageRouter.get('/unread-count', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('recipient_id', me).is('read_at', null);
    return res.json({ success: true, count: count || 0 });
  } catch { return res.json({ success: true, count: 0 }); }
});

// ─── Reglage : autoriser la reception de messages ───────────────────────
messageRouter.get('/settings', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const { data } = await supabase.from('users').select('messages_enabled').eq('id', me).limit(1).single();
    return res.json({ success: true, messages_enabled: (data as any)?.messages_enabled !== false });
  } catch { return res.json({ success: true, messages_enabled: true }); }
});
messageRouter.put('/settings', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const enabled = !!(req.body || {}).enabled;
    const { error } = await supabase.from('users').update({ messages_enabled: enabled }).eq('id', me);
    if (error) throw error;
    return res.json({ success: true, messages_enabled: enabled });
  } catch { return res.status(500).json({ error: 'SETTINGS_FAILED' }); }
});

// ─── Blocage ────────────────────────────────────────────────────────────
messageRouter.get('/blocks', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const { data } = await supabase.from('message_blocks').select('blocked_id, created_at').eq('blocker_id', me);
    const ids = (data || []).map((b: any) => b.blocked_id);
    const names: Record<string, string> = {};
    if (ids.length) { const { data: us } = await supabase.from('users').select('id, name').in('id', ids); for (const u of (us || []) as any[]) names[u.id] = u.name || 'Utilisateur'; }
    return res.json({ success: true, data: (data || []).map((b: any) => ({ user_id: b.blocked_id, name: names[b.blocked_id] || 'Utilisateur', created_at: b.created_at })) });
  } catch { return res.status(500).json({ error: 'BLOCKS_FAILED' }); }
});
messageRouter.post('/block', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const uid = String((req.body || {}).user_id || '');
    if (!UUID.test(uid) || uid === me) return res.status(400).json({ error: 'BAD_TARGET' });
    await supabase.from('message_blocks').upsert({ blocker_id: me, blocked_id: uid }, { onConflict: 'blocker_id,blocked_id' });
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'BLOCK_FAILED' }); }
});
messageRouter.delete('/block/:userId', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const uid = String(req.params.userId || '');
    if (!UUID.test(uid)) return res.status(400).json({ error: 'BAD_TARGET' });
    await supabase.from('message_blocks').delete().eq('blocker_id', me).eq('blocked_id', uid);
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'UNBLOCK_FAILED' }); }
});

// ─── Fil de conversation avec un utilisateur ────────────────────────────
messageRouter.get('/thread/:userId', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const other = String(req.params.userId || '');
    if (!UUID.test(other) || other === me) return res.status(400).json({ error: 'BAD_TARGET' });
    const { data } = await supabase.from('messages')
      .select('id, sender_id, recipient_id, body, created_at, read_at')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
      .order('created_at', { ascending: true }).limit(500);
    // marque comme lus les entrants
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('recipient_id', me).eq('sender_id', other).is('read_at', null);
    const { data: ou } = await supabase.from('users').select('id, name, messages_enabled').eq('id', other).limit(1).single();
    const otherIsCandidate = await isCandidate(other);
    const hasIncoming = (data || []).some((m: any) => m.sender_id === other);
    const blocked = await blockedBetween(me, other);
    const canMessage = !blocked && ((ou as any)?.messages_enabled !== false) && (otherIsCandidate || hasIncoming);
    return res.json({ success: true, other: { id: other, name: (ou as any)?.name || 'Utilisateur' }, can_message: canMessage, blocked, data: data || [] });
  } catch { return res.status(500).json({ error: 'THREAD_FAILED' }); }
});

// ─── Envoyer un message ─────────────────────────────────────────────────
messageRouter.post('/', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const b = req.body || {};
    const recipient = String(b.recipient_id || '');
    const body = String(b.body || '').trim();
    if (!UUID.test(recipient) || recipient === me) return res.status(400).json({ error: 'BAD_RECIPIENT' });
    if (!body) return res.status(400).json({ error: 'EMPTY' });
    if (body.length > BODY_MAX) return res.status(400).json({ error: 'TOO_LONG', message: `Message trop long (max ${BODY_MAX} caracteres).` });

    if (await blockedBetween(me, recipient)) return res.status(403).json({ error: 'BLOCKED', message: 'Echange bloque.' });

    const { data: ru } = await supabase.from('users').select('messages_enabled, email, name').eq('id', recipient).limit(1).single();
    if (!ru) return res.status(404).json({ error: 'NO_RECIPIENT' });
    if ((ru as any).messages_enabled === false) return res.status(403).json({ error: 'RECIPIENT_DISABLED', message: 'Cet utilisateur a desactive la reception de messages.' });

    // on n'ecrit qu'a un candidat, SAUF si on repond (il nous a deja ecrit)
    const candidate = await isCandidate(recipient);
    if (!candidate) {
      const { data: inc } = await supabase.from('messages').select('id').eq('sender_id', recipient).eq('recipient_id', me).limit(1);
      if (!((inc || []).length > 0)) return res.status(403).json({ error: 'NOT_CANDIDATE', message: 'Tu ne peux ecrire qu a un candidat.' });
    }

    // anti-spam : max 20 NOUVEAUX destinataires / 24 h
    const { data: existing } = await supabase.from('messages').select('id')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${recipient}),and(sender_id.eq.${recipient},recipient_id.eq.${me})`).limit(1);
    const isNewContact = !((existing || []).length > 0);
    if (isNewContact) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: recent } = await supabase.from('messages').select('recipient_id').eq('sender_id', me).gte('created_at', since).limit(500);
      const distinct = new Set((recent || []).map((m: any) => m.recipient_id));
      if (distinct.size >= 20) return res.status(429).json({ error: 'TOO_MANY_NEW', message: 'Trop de nouveaux contacts aujourd hui. Reessaie demain.' });
    }

    const flag = scanSensitive(body);

    const { data: ins, error } = await supabase.from('messages').insert({
      sender_id: me, recipient_id: recipient, body: body.slice(0, BODY_MAX),
      flagged: !!flag, flag_reason: flag,
    }).select('id, created_at').limit(1).single();
    if (error) throw error;

    // notification in-app (best-effort)
    try {
      await supabase.from('notifications').insert({ user_id: recipient, type: 'message', title: 'Nouveau message', message: 'Tu as recu un message sur Diki-Diki.', data: { from: me } });
    } catch { /* best-effort */ }
    // e-mail Resend (best-effort, sans le contenu)
    try {
      const RESEND = process.env.RESEND_API_KEY;
      const REPLY_TO = process.env.SUPPORT_REPLY_TO || process.env.CONTACT_TO || 'ifedeg@gmail.com';
      const to = (ru as any).email;
      if (RESEND && to && /.+@.+\..+/.test(String(to))) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Diki-Diki <support@diki-diki.com>', to: [String(to)], reply_to: [REPLY_TO],
            subject: 'Nouveau message sur Diki-Diki',
            text: 'Tu as recu un nouveau message sur Diki-Diki. Connecte-toi pour le lire : https://www.diki-diki.com/messages',
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1a1a1a"><h2 style="color:#e11d8f;margin:0 0 12px">Nouveau message \u{1F4AC}</h2><p style="font-size:15px;line-height:1.6">Tu as recu un nouveau message sur Diki-Diki.</p><p><a href="https://www.diki-diki.com/messages" style="display:inline-block;background:#FFAA00;color:#000;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none">Lire le message</a></p><p style="margin-top:24px;font-size:12px;color:#888">Diki-Diki — l'Arene des talents africains · <a href="https://www.diki-diki.com">www.diki-diki.com</a></p></div>`,
          }),
        });
      }
    } catch { /* best-effort */ }

    return res.json({ success: true, id: (ins as any)?.id, created_at: (ins as any)?.created_at, flagged: !!flag });
  } catch { return res.status(500).json({ error: 'SEND_FAILED' }); }
});

// ─── Signaler un message ────────────────────────────────────────────────
messageRouter.post('/:id/report', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const id = String(req.params.id || ''); if (!UUID.test(id)) return res.status(400).json({ error: 'BAD_ID' });
    const reason = String((req.body || {}).reason || '').slice(0, 200) || null;
    const { data: m } = await supabase.from('messages').select('id, sender_id, recipient_id').eq('id', id).limit(1).single();
    if (!m) return res.status(404).json({ error: 'NOT_FOUND' });
    if ((m as any).sender_id !== me && (m as any).recipient_id !== me) return res.status(403).json({ error: 'NOT_YOURS' });
    await supabase.from('messages').update({ reported: true, reported_reason: reason, reporter_id: me }).eq('id', id);
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'REPORT_FAILED' }); }
});

// ─── Moderation : messages signales ou marques ──────────────────────────
messageRouter.get('/admin/reported', requireAuth, requireAdmin, async (_req: any, res) => {
  try {
    const { data } = await supabase.from('messages')
      .select('id, sender_id, recipient_id, body, created_at, flagged, flag_reason, reported, reported_reason')
      .or('flagged.eq.true,reported.eq.true')
      .order('created_at', { ascending: false }).limit(200);
    return res.json({ success: true, data: data || [] });
  } catch { return res.status(500).json({ error: 'MOD_FAILED' }); }
});

export default messageRouter;
