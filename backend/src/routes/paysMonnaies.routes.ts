/*DKDK_PAYS_MONNAIES_ROUTES*/
import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const paysMonnaiesRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /v1/pays-monnaies - liste complete (public)
paysMonnaiesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('pays_monnaies')
      .select('*')
      .order('pays', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /v1/pays-monnaies/resoudre?phone=+22997000000 - monnaie du numero (public)
// Trouve le PLUS LONG indicatif qui prefixe le numero (evite que +27 capte un +271...)
paysMonnaiesRouter.get('/resoudre', async (req: Request, res: Response) => {
  try {
    const phoneRaw = String(req.query.phone || '').trim();
    const phone = phoneRaw.replace(/\D/g, ''); // chiffres seuls (insensible + / espace / %2B)
    const { data, error } = await getSupabase()
      .from('pays_monnaies')
      .select('*');
    if (error) throw error;
    const lignes = data || [];

    // le defaut international ('+0') sert de repli
    const repli = lignes.find((l: any) => l.indicatif === '+0')
      || { indicatif: '+0', pays: 'International', code_monnaie: 'USD', symbole: '$', zone: 'international', taux_vers_reference: 0.20 };

    if (!phone) { return res.json({ ...repli, resolu: false }); }

    // on ignore la ligne '+0' pour la correspondance, et on garde le plus long indicatif qui prefixe
    let meilleur: any = null;
    for (const l of lignes) {
      if (l.indicatif === '+0') continue;
      const indic = String(l.indicatif).replace(/\D/g, '');
      if (indic && phone.startsWith(indic)) {
        if (!meilleur || l.indicatif.length > meilleur.indicatif.length) meilleur = l;
      }
    }
    if (meilleur) return res.json({ ...meilleur, resolu: true });
    return res.json({ ...repli, resolu: false });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/*DKDK_REFRESH_TAUX*/
paysMonnaiesRouter.post('/refresh-taux', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const key = process.env.EXCHANGE_API_KEY;
    if (!key) return res.status(500).json({ error: 'EXCHANGE_API_KEY manquante' });
    const doFetch: any = (globalThis as any).fetch;
    if (!doFetch) return res.status(500).json({ error: 'fetch indisponible (Node < 18 ?)' });
    const r = await doFetch("https://v6.exchangerate-api.com/v6/" + key + "/latest/USD");
    const j = await r.json();
    if (j.result !== 'success') return res.status(502).json({ error: 'API taux: ' + (j['error-type'] || 'echec') });
    const rates = j.conversion_rates || {};
    const REF_USD = 0.20;
    const sb = getSupabase();
    const sel = await sb.from('pays_monnaies').select('id, code_monnaie').is('taux_vers_reference', null);
    if (sel.error) throw sel.error;
    let maj = 0; const introuvables: string[] = [];
    for (const row of (sel.data || []) as any[]) {
      const code = row.code_monnaie;
      if (!code) continue;
      const taux = rates[code];
      if (typeof taux !== 'number') { introuvables.push(code); continue; }
      const val = Math.round(REF_USD * taux * 10000) / 10000;
      const up = await sb.from('pays_monnaies').update({ taux_vers_reference: val }).eq('id', row.id);
      if (!up.error) maj++;
    }
    res.json({ success: true, mis_a_jour: maj, monnaies_introuvables: Array.from(new Set(introuvables)) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export { paysMonnaiesRouter };