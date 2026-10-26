// backend/src/routes/echanges.routes.ts
// DKDK_ECHANGES — Espace d'échanges entre inscrits : Mur d'entraide + Annuaire.
// Le contact privé réutilise la messagerie existante (/v1/messages).
// Aucune logique d'argent : flux séparé des votes / de la cagnotte.
import { Router } from 'express';
import { supabase } from '../../config/supabase';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const echangesRouter = Router();
const MSG_MAX = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ['solo', 'groupe'];

// Détection de sollicitation hors plateforme : on MARQUE (flag) sans bloquer.
const SENSITIVE: RegExp[] = [
  /\b(mtn|moov|celtiis|flooz|momo|mobile\s*money)\b/i,
  /\bvote[s]?\s*(contre|pour)\s*vote[s]?\b/i,
  /\bhors[\s-]*(appli|application|plateforme|site|diki)\b/i,
  /\bwhats?app\b/i,
  /(\+?229[\s.\-]?)?([0-9][\s.\-]?){9,}/,
];
function scan(t: string): string | null { for (const re of SENSITIVE) if (re.test(t)) return re.source.slice(0, 60); return null; }

async function namesByIds(ids: string[]): Promise<Record<string, any>> {
  const map: Record<string, any> = {};
  if (!ids.length) return map;
  const { data } = await supabase.from('users').select('id, name, username, avatar_url').in('id', ids);
  for (const u of (data || []) as any[]) map[u.id] = u;
  return map;
}
async function candidateSet(ids: string[]): Promise<Set<string>> {
  const set = new Set<string>();
  if (!ids.length) return set;
  const { data } = await supabase.from('bracket_participants').select('user_id').in('user_id', ids);
  for (const r of (data || []) as any[]) set.add(r.user_id);
  return set;
}

// ─── MUR : liste des annonces ouvertes ──────────────────────────────────
echangesRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const disc = req.query.discipline ? String(req.query.discipline) : null;
    const type = req.query.type ? String(req.query.type) : null;
    let q = supabase.from('echanges_posts')
      .select('id, auteur_id, discipline, type, message, created_at')
      .eq('statut', 'ouvert').order('created_at', { ascending: false }).limit(200);
    if (disc) q = q.eq('discipline', disc);
    if (type && TYPES.includes(type)) q = q.eq('type', type);
    const { data } = await q;
    const posts = (data || []) as any[];
    const auteurs = await namesByIds([...new Set(posts.map(p => p.auteur_id))]);
    const list = posts.map(p => ({
      ...p,
      auteur_nom: auteurs[p.auteur_id]?.username || auteurs[p.auteur_id]?.name || 'Inscrit',
      auteur_avatar: auteurs[p.auteur_id]?.avatar_url || null,
    }));
    return res.json({ success: true, data: list });
  } catch { return res.status(500).json({ error: 'LIST_FAILED' }); }
});

// ─── MUR : publier une annonce ──────────────────────────────────────────
echangesRouter.post('/', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; if (!me) return res.status(401).json({ error: 'NO_AUTH' });
    const b = req.body || {};
    const message = String(b.message || '').trim();
    const discipline = b.discipline ? String(b.discipline).slice(0, 40) : null;
    const type = TYPES.includes(String(b.type)) ? String(b.type) : 'solo';
    if (!message) return res.status(400).json({ error: 'EMPTY' });
    if (message.length > MSG_MAX) return res.status(400).json({ error: 'TOO_LONG', message: `Annonce trop longue (max ${MSG_MAX} caractères).` });
    const flag = scan(message);
    const { data, error } = await supabase.from('echanges_posts').insert({
      auteur_id: me, discipline, type, message: message.slice(0, MSG_MAX),
      flagged: !!flag, flagged_reason: flag,
    }).select('id, created_at').limit(1).single();
    if (error) throw error;
    return res.json({ success: true, id: (data as any).id });
  } catch { return res.status(500).json({ error: 'CREATE_FAILED' }); }
});

// ─── MUR : fermer sa propre annonce ─────────────────────────────────────
echangesRouter.post('/:id/close', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId; const id = String(req.params.id);
    if (!UUID.test(id)) return res.status(400).json({ error: 'BAD_ID' });
    const { data: row } = await supabase.from('echanges_posts').select('auteur_id').eq('id', id).limit(1).single();
    if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
    if ((row as any).auteur_id !== me) return res.status(403).json({ error: 'NOT_OWNER' });
    await supabase.from('echanges_posts').update({ statut: 'ferme' }).eq('id', id);
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'CLOSE_FAILED' }); }
});

// ─── MUR : signaler une annonce ─────────────────────────────────────────
echangesRouter.post('/:id/report', requireAuth, async (req: any, res) => {
  try {
    const id = String(req.params.id); if (!UUID.test(id)) return res.status(400).json({ error: 'BAD_ID' });
    const reason = String((req.body || {}).reason || '').slice(0, 200) || null;
    await supabase.from('echanges_posts').update({ reported: true, reported_reason: reason }).eq('id', id);
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: 'REPORT_FAILED' }); }
});

// ─── ANNUAIRE : liste des inscrits visibles ─────────────────────────────
echangesRouter.get('/annuaire', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId;
    const search = req.query.q ? String(req.query.q).trim() : '';
    let q = supabase.from('users').select('id, name, username, avatar_url').eq('annuaire_visible', true).limit(200);
    if (search) q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%`);
    const { data } = await q;
    const users = (data || []) as any[];
    const cands = await candidateSet(users.map(u => u.id));
    const list = users.filter(u => u.id !== me).map(u => ({
      id: u.id, pseudo: u.username || u.name || 'Inscrit', avatar: u.avatar_url || null, candidat: cands.has(u.id),
    }));
    return res.json({ success: true, data: list });
  } catch { return res.status(500).json({ error: 'ANNUAIRE_FAILED' }); }
});

// ─── ANNUAIRE : mon réglage de visibilité ───────────────────────────────
echangesRouter.get('/annuaire/me', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId;
    const { data } = await supabase.from('users').select('annuaire_visible').eq('id', me).limit(1).single();
    return res.json({ success: true, visible: (data as any)?.annuaire_visible !== false });
  } catch { return res.json({ success: true, visible: true }); }
});
echangesRouter.put('/annuaire/me', requireAuth, async (req: any, res) => {
  try {
    const me = req.user?.userId;
    const visible = !!(req.body || {}).visible;
    const { error } = await supabase.from('users').update({ annuaire_visible: visible }).eq('id', me);
    if (error) throw error;
    return res.json({ success: true, visible });
  } catch { return res.status(500).json({ error: 'SETTING_FAILED' }); }
});

// ─── ADMIN : annonces signalées / auto-détectées ────────────────────────
echangesRouter.get('/admin/reported', requireAuth, requireAdmin, async (_req: any, res) => {
  try {
    const { data } = await supabase.from('echanges_posts').select('*')
      .or('reported.eq.true,flagged.eq.true').order('created_at', { ascending: false }).limit(200);
    const posts = (data || []) as any[];
    const auteurs = await namesByIds([...new Set(posts.map(p => p.auteur_id))]);
    return res.json({ success: true, data: posts.map(p => ({ ...p, auteur_nom: auteurs[p.auteur_id]?.name || 'Inscrit' })) });
  } catch { return res.status(500).json({ error: 'ADMIN_FAILED' }); }
});

export default echangesRouter;
