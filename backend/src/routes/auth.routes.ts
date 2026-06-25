// ============================================================
// PAC — Auth Routes  →  /v1/auth
// ============================================================
import { Router }       from 'express';
import * as authCtrl    from '../controllers/auth.controller';

export const authRouter = Router();

// POST /v1/auth/register    → inscription (email + téléphone + password)
authRouter.post('/register',    authCtrl.register);

// POST /v1/auth/verify-otp  → validation OTP SMS
authRouter.post('/verify-otp',  authCtrl.verifyOTP);

// POST /v1/auth/resend-otp  → renvoyer OTP
authRouter.post('/resend-otp',  authCtrl.resendOTP);

// POST /v1/auth/one-tap        → envoyer OTP (crée compte implicite si nouveau)
// POST /v1/auth/one-tap/verify → vérifier OTP → JWT immédiat
/*DKDK_ONETAP_ROUTES*/
authRouter.post('/one-tap',        authCtrl.oneTapSend);
authRouter.post('/one-tap/verify', authCtrl.oneTapVerify);

// POST /v1/auth/login       → connexion (email ou téléphone + password)
authRouter.post('/login',       authCtrl.login);

// POST /v1/auth/social      → connexion Google ou Facebook
authRouter.post('/social',      authCtrl.socialAuth);
