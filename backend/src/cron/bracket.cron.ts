// backend/src/cron/bracket.cron.ts
import { checkAndAdvanceRounds } from '../services/bracket.service';

/**
 * Lance le cron bracket.
 * Appelé depuis index.ts au démarrage du serveur.
 * Tourne toutes les heures.
 */
export function startBracketCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 heure

  console.log('⚡ [BRACKET CRON] Démarré — vérification toutes les heures');

  const run = async () => {
    try {
      console.log(`⚡ [BRACKET CRON] Vérification des duels à ${new Date().toISOString()}`);
      await checkAndAdvanceRounds();
    } catch (err: any) {
      console.error('🔴 [BRACKET CRON] Erreur :', err.message);
    }
  };

  // Lancement immédiat au démarrage
  run();

  // Puis toutes les heures
  setInterval(run, INTERVAL_MS);
}