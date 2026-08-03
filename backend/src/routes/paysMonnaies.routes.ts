/*DKDK_PAYS_MONNAIES_ROUTES*/
import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

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

export { paysMonnaiesRouter };