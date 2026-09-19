// ============================================================
// PAC — Auth Controller
// ============================================================
import { Request, Response } from 'express';
import { z }                 from 'zod';
import * as authService      from '../services/auth.service';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.middleware';

// Pose le cookie httpOnly quand la réponse contient un jeton (additif :
// le jeton reste aussi dans le JSON pour le header Bearer / localStorage).
function issueToken(res: Response, result: any) {
  if (result && typeof result.token === 'string') setAuthCookie(res, result.token);
}

// ─── Schemas de validation ───────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(2).max(50),
  email:    z.string().email('Email invalide'),
  phone:    z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Téléphone invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  country:  z.string().min(2),
  // Garde-fou serveur : l'acceptation des CGU/Règlement doit valoir exactement true.
  accepted: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les CGU et le Règlement' }) }),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password:   z.string().min(1),
});

const otpSchema = z.object({
  phone: z.string(),
  otp:   z.string().length(6, 'OTP doit être 6 chiffres'),
});

const socialSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  token:    z.string().min(1),
});

const phoneSchema = z.object({
  phone: z.string().min(8),
});

// ─── Handlers ────────────────────────────────────────────────
export async function register(req: Request, res: Response) {
  try {
    const data   = registerSchema.parse(req.body);
    const result = await authService.registerUser(data as any);
    issueToken(res, result);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.errors });
    res.status(400).json({ error: err.message || 'REGISTER_FAILED' });
  }
}

export async function verifyOTP(req: Request, res: Response) {
  try {
    const { phone, otp } = otpSchema.parse(req.body);
    const result         = await authService.verifyOTP(phone, otp);
    issueToken(res, result);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'OTP_FAILED' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const result                   = await authService.loginUser(identifier, password);
    issueToken(res, result);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(401).json({ error: err.message || 'LOGIN_FAILED' });
  }
}

export async function socialAuth(req: Request, res: Response) {
  try {
    const { provider, token } = socialSchema.parse(req.body);
    const accepted            = req.body?.accepted === true; // H6
    const result              = await authService.socialAuth(provider, token, accepted);
    issueToken(res, result);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'SOCIAL_AUTH_FAILED' });
  }
}

export async function resendOTP(req: Request, res: Response) {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const result    = await authService.resendOTP(phone);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'RESEND_FAILED' });
  }
}

/*DKDK_ONETAP_CTRL*/
export async function oneTapSend(req: Request, res: Response) {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const accepted  = req.body?.accepted === true; // H6
    const result    = await authService.oneTapSend(phone, accepted);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'ONETAP_SEND_FAILED' });
  }
}

export async function oneTapVerify(req: Request, res: Response) {
  try {
    const { phone, otp } = otpSchema.parse(req.body);
    const result         = await authService.oneTapVerify(phone, otp);
    issueToken(res, result);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'ONETAP_VERIFY_FAILED' });
  }
}

/*DKDK_ATTACH_PHONE_CTRL*/
export async function attachPhoneSend(req: any, res: Response) {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'TOKEN_MISSING' });
    const result = await authService.attachPhoneSend(userId, phone);
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'ATTACH_SEND_FAILED' });
  }
}

export async function attachPhoneVerify(req: any, res: Response) {
  try {
    const otp = String(req.body?.otp || '');
    if (otp.length !== 6) return res.status(400).json({ error: 'VALIDATION_ERROR' });
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'TOKEN_MISSING' });
    const result = await authService.attachPhoneVerify(userId, otp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'ATTACH_VERIFY_FAILED' });
  }
}

// ─── Session cookie httpOnly ─────────────────────────────────────
// GET /v1/auth/me : renvoie l'utilisateur courant (userId + role) à partir
// du jeton (cookie ou Bearer). Nécessaire une fois le jeton passé en cookie
// httpOnly : le JavaScript ne peut plus lire le rôle depuis localStorage.
// À monter derrière requireAuth.
export async function me(req: any, res: Response) {
  const user = req.user;
  if (!user?.userId) return res.status(401).json({ error: 'TOKEN_MISSING' });
  res.json({ userId: user.userId, role: user.role, totp_pending: !!user.totp_pending });
}

// POST /v1/auth/logout : efface le cookie de session httpOnly.
// (Le localStorage, lui, est vidé côté client.) Volontairement sans requireAuth :
// se déconnecter doit marcher même avec un jeton déjà expiré.
export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.json({ success: true });
}
