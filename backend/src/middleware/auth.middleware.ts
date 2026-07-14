import { supabase } from '../../config/supabase';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pac-secret-change-me';

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
    .select('is_verified')
    .eq('id', userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  if (!data.is_verified) {
    return res.status(403).json({
      error: 'PHONE_NOT_VERIFIED',
      message: 'Verifie ton numero de telephone pour continuer.',
    });
  }

  next();
}

