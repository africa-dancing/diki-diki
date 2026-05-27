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