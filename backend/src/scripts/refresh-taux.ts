/*DKDK_CRON_REFRESH_TAUX*/
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const key = process.env.EXCHANGE_API_KEY;
  if (!key) { console.error('EXCHANGE_API_KEY manquante'); process.exit(1); }
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const doFetch: any = (globalThis as any).fetch;
  const r = await doFetch('https://v6.exchangerate-api.com/v6/' + key + '/latest/USD');
  const j = await r.json();
  if (j.result !== 'success') { console.error('API taux echec:', j['error-type']); process.exit(1); }
  const rates = j.conversion_rates || {};
  const REF_USD = 0.20;
  const sel = await sb.from('pays_monnaies').select('id, code_monnaie').is('taux_vers_reference', null);
  if (sel.error) { console.error(sel.error.message); process.exit(1); }
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
  console.log('[refresh-taux] mis a jour:', maj, '| introuvables:', Array.from(new Set(introuvables)));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
