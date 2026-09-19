import { supabase } from '../../config/supabase';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// SÉCURITÉ (B1) : aucune valeur par défaut. Si JWT_SECRET est absent de
// l'environnement, le serveur DOIT refuser de démarrer plutôt que de signer
// et d'accepter des jetons avec un secret public connu (forge d'admin possible).
const _jwtSecret = process.env.JWT_SECRET;
if (!_jwtSecret) {
  throw new Error('FATAL: JWT_SECRET est absent des variables d\'environnement. Le serveur refuse de demarrer.');
}
const JWT_SECRET: string = _jwtSecret;

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; totp_pending?: boolean };
}

// ── SÉCURITÉ (cookie httpOnly) ──────────────────────────────────────
// Migration progressive du jeton de session vers un cookie httpOnly
// (invisible du JavaScript → protège contre le vol de session par XSS).
// C'est ADDITIF : le header Bearer + localStorage continuent de marcher.
// Le cookie ne devient utile qu'une fois le proxy /api → Railway en place
// (il devient alors "first-party") ; d'ici là il est posé mais inerte.
export const AUTH_COOKIE = 'dkdk_token';

const COOKIE_OPTS = {
  httpOnly: true as const,
  secure:   true as const,       // HTTPS uniquement
  sameSite: 'lax' as const,      // first-party via le proxy Next.js
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours, aligné sur l'expiration du JWT
  path:     '/',
};

/** Pose le cookie httpOnly de session (en plus du jeton renvoyé dans le JSON). */
export function setAuthCookie(res: Response, token: string) {
  try { res.cookie(AUTH_COOKIE, token, COOKIE_OPTS); } catch { /* jamais bloquer la réponse */ }
}

/** Efface le cookie de session (déconnexion). */
export function clearAuthCookie(res: Response) {
  try { res.clearCookie(AUTH_COOKIE, { path: '/' }); } catch { /* no-op */ }
}

/** Lit le jeton depuis le cookie dkdk_token (parse manuel, sans dépendance). */
function readCookieToken(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === AUTH_COOKIE) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export async function requireAuth(
  req: AuthRequest, res: Response, next: NextFunction
) {
  // Priorité au header Bearer (comportement historique inchangé),
  // puis repli sur le cookie httpOnly dkdk_token.
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.split(' ')[1]
    : readCookieToken(req);

  if (!token) {
    return res.status(401).json({ error: 'TOKEN_MISSING' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'TOKEN_INVALID' });
  }
}

export function requireAdmin(
  req: AuthRequest, res: Response, next: NextFunction
) {
  if (!['admin', 'moderateur'].includes(req.user?.role || '')) {
    return res.status(403).json({ error: 'ADMIN_ONLY' });
  }
  // SÉCURITÉ (H1) : un jeton "en attente de TOTP" ne donne AUCUN pouvoir admin.
  if (req.user?.totp_pending) {
    return res.status(401).json({ error: 'TOTP_REQUIRED' });
  }
  next();
}

/*DKDK_SMS_DIFF*/
// --- requireVerified ------------------------------------------------
// Le SMS de verification coute 17 F. On ne l'envoie donc PAS a
// l'inscription (un curieux qui ne revient jamais nous couterait 17 F),
// mais au moment ou l'argent entre en jeu : recharge, vote, retrait,
// soumission de video.
//
// A poser APRES requireAuth : il a besoin de req.user.userId.
export async function requireVerified(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'TOKEN_MISSING' });

  const { data, error } = await supabase
    .from('users')
    .select('phone_verified') /*DKDK_REQ_PHONE*/
    .eq('id', userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  if (!data.phone_verified) {
    return res.status(403).json({
      error: 'PHONE_NOT_VERIFIED',
      message: 'Verifie ton numero de telephone pour continuer.',
    });
  }

  next();
}

