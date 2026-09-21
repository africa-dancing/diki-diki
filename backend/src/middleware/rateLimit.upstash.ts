// backend/src/middleware/rateLimit.upstash.ts
// Rate-limit distribué via Upstash Redis (fenêtre fixe), 100 % FAIL-OPEN :
// - si Redis est absent/mal configuré/en erreur → on LAISSE PASSER (jamais de blocage),
// - la CONSTRUCTION du client est elle-même défensive → le serveur ne peut JAMAIS
//   planter au démarrage à cause de ce middleware.
import { Redis } from '@upstash/redis';
import { Request, Response, NextFunction } from 'express';

const _url   = process.env.UPSTASH_REDIS_REST_URL;
const _token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Construction défensive : URL/token absents OU invalides → limiteur désactivé, pas de crash.
let redis: Redis | null = null;
try {
  if (_url && _token && /^https:\/\//i.test(_url)) {
    redis = new Redis({ url: _url, token: _token });
  } else if (_url || _token) {
    console.warn('[RATELIMIT] Upstash: variables présentes mais URL REST invalide (doit commencer par https://) → limiteur distribué désactivé (fail-open).');
  } else {
    console.warn('[RATELIMIT] Upstash non configuré → limiteur distribué désactivé (fail-open).');
  }
} catch (e: any) {
  console.error('[RATELIMIT] init Upstash impossible → fail-open (limiteur désactivé):', e?.message ?? e);
  redis = null;
}

function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return (req.ip || xff.split(',')[0] || 'unknown').toString().trim();
}

/**
 * Fenêtre fixe : au plus `max` requêtes par `windowSec` et par IP, pour un `prefix` donné.
 * En cas d'absence de Redis ou d'erreur → next() (fail-open).
 */
export function upstashRateLimit(opts: { prefix: string; windowSec: number; max: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redis) return next(); // pas de Redis → on n'entrave rien
    try {
      const bucket = Math.floor(Date.now() / 1000 / opts.windowSec);
      const key    = `rl:${opts.prefix}:${clientIp(req)}:${bucket}`;
      const count  = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSec);
      }
      if (count > opts.max) {
        return res.status(429).json({ error: 'TOO_MANY_REQUESTS' });
      }
      return next();
    } catch (e: any) {
      console.error('[RATELIMIT] Upstash erreur (fail-open, requête laissée passer):', e?.message ?? e);
      return next();
    }
  };
}
