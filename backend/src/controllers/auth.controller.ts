// ============================================================
// PAC — Auth Controller
// ============================================================
import { Request, Response } from 'express';
import { z }                 from 'zod';
import * as authService      from '../services/auth.service';

// ─── Schemas de validation ───────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(2).max(50),
  email:    z.string().email('Email invalide'),
  phone:    z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Téléphone invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  country:  z.string().min(2),
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
    const result              = await authService.socialAuth(provider, token);
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
    const result    = await authService.oneTapSend(phone);
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
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    res.status(400).json({ error: err.message || 'ONETAP_VERIFY_FAILED' });
  }
}
