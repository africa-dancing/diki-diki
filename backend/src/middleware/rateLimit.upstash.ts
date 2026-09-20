// backend/src/middleware/rateLimit.upstash.ts
// Rate-limit distribué via Upstash Redis (fenêtre fixe), 100 % FAIL-OPEN :
// si Redis est absent, mal configuré ou en erreur, on LAISSE PASSER la requête
// (on ne bloque JAMAIS le trafic à cause du limiteur). Complète le limiteur
// en mémoire (express-rate-limit) par une protection partagée entre instances.
import { Redis } from '@upstash/redis';
import { Request, Response, NextFunction } from 'express';

const _url   = process.env.UPSTASH_REDIS_REST_URL;
const _token = process.env.UPSTASH_REDIS_REST_TOKEN;

// null si non configuré → le middleware devient un simple passe-plat.
const redis = (_url && _token) ? new Redis({ url: _url, token: _token }) : null;

if (!redis) {
  console.warn('[RATELIMIT] Upstash non configuré (UPSTASH_REDIS_REST_URL/TOKEN absents) → limiteur distribué désactivé (fail-open).');
}

function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return (req.ip || xff.split(',')[0] || 'unknown').toString().trim();
}

/**
 * Fenêtre fixe : au plus `max` requêtes par `windowSec` et par IP, pour un `prefix` donné.
 * En cas d'erreur Redis → next() (fail-open).
 */
export function upstashRateLimit(opts: { prefix: string; windowSec: number; max: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redis) return next(); // pas de Redis → on n'entrave rien
    try {
      const bucket = Math.floor(Date.now() / 1000 / opts.windowSec);
      const key    = `rl:${opts.prefix}:${clientIp(req)}:${bucket}`;
      const count  = await redis.incr(key);
      if (count === 1) {
        // première requête de la fenêtre → on fixe l'expiration
        await redis.expire(key, opts.windowSec);
      }
      if (count > opts.max) {
        return res.status(429).json({ error: 'TOO_MANY_REQUESTS' });
      }
      return next();
    } catch (e: any) {
      // FAIL-OPEN absolu : jamais de blocage à cause du limiteur.
      console.error('[RATELIMIT] Upstash erreur (fail-open, requête laissée passer):', e?.message ?? e);
      return next();
    }
  };
}
