// backend/src/cron/analytics.cron.ts
/*DKDK_ANALYTICS_CRON*/
// Purge les pages vues de plus de RETENTION_JOURS.
// Sans cela la table page_views grossit indefiniment et finit par
// saturer la base (Supabase FREE = 500 Mo).
import { supabase } from '../../config/supabase';

const RETENTION_JOURS = 90;
const INTERVALLE_MS   = 24 * 60 * 60 * 1000; // une fois par jour

async function purger() {
  try {
    const limite = new Date(Date.now() - RETENTION_JOURS * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('page_views')
      .delete()
      .lt('created_at', limite.toISOString())
      .select('id');

    if (error) {
      console.error('[ANALYTICS_PURGE] echec :', error.message);
      return;
    }

    const n = (data || []).length;
    if (n > 0) {
      console.log('[ANALYTICS_PURGE] ' + n + ' ligne(s) de plus de ' + RETENTION_JOURS + ' jours supprimee(s).');
    } else {
      console.log('[ANALYTICS_PURGE] rien a purger.');
    }
  } catch (e: any) {
    // Une purge ratee ne doit jamais faire tomber le serveur.
    console.error('[ANALYTICS_PURGE] erreur inattendue :', e?.message ?? e);
  }
}

export function startAnalyticsCron() {
  console.log('[ANALYTICS_PURGE] Cron demarre - retention ' + RETENTION_JOURS + ' jours.');
  purger();                       // une fois au demarrage
  setInterval(purger, INTERVALLE_MS); // puis chaque jour
}
