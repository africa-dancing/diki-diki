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
  user?: { userId: string; role: string };
}

export async function requireAuth(
  req: AuthRequest, res: Response, next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'TOKEN_MISSING' });
  }
  try {
    const token = header.split(' ')[1];
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

