// backend/src/controllers/totp.controller.ts
/*DKDK_TOTP*/
// Authentification a deux facteurs par TOTP (Google Authenticator).
// Le secret vit en base (users.totp_secret), jamais dans le frontend.
// Le code est verifie cote serveur.
import { Response } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { supabase } from '../../config/supabase';
import { AuthRequest } from '../middleware/auth.middleware';

// Tolerance : accepte le code precedent et le suivant (decalage d'horloge).
authenticator.options = { window: 1 };

// --- 1) Preparer : genere un secret + un QR code -------------------
// Le secret n'est PAS encore actif : il faut le confirmer via /activate.
export async function setupTotp(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });

    const { data: user, error } = await supabase
      .from('users').select('email, totp_secret').eq('id', userId).single();

    if (error || !user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });

    if (user.totp_secret) {
      return res.status(409).json({ success: false, error: 'Le TOTP est deja actif sur ce compte.' });
    }

    const secret = authenticator.generateSecret(20); /*DKDK_TOTP_LEN*/
    const uri    = authenticator.keyuri(user.email, 'Diki-Diki Admin', secret);
    const qr     = await QRCode.toDataURL(uri);

    // On ne stocke rien encore. Le secret est renvoye une seule fois,
    // le frontend le renverra a l'activation.
    return res.json({ success: true, secret, qr });
  } catch (e: any) {
    console.error('[TOTP] setup :', e?.message ?? e);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}

// --- 2) Activer : verifie un premier code, puis enregistre ---------
export async function activateTotp(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });

    const secret = String(req.body?.secret ?? '');
    const code   = String(req.body?.code ?? '');

    if (!secret || !code) {
      return res.status(400).json({ success: false, error: 'Secret et code requis.' });
    }

    // On verifie que l'utilisateur a bien scanne le QR code.
    const valide = authenticator.verify({ token: code, secret });
    if (!valide) {
      return res.status(403).json({ success: false, error: 'Code incorrect. Verifie ton application.' });
    }

    const { error } = await supabase
      .from('users').update({ totp_secret: secret }).eq('id', userId);

    if (error) {
      console.error('[TOTP] activate :', error.message);
      return res.status(500).json({ success: false, error: 'Enregistrement echoue.' });
    }

    return res.json({ success: true });
  } catch (e: any) {
    console.error('[TOTP] activate :', e?.message ?? e);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}

// --- 3) Verifier : appele a la connexion admin ---------------------
// Recoit un JWT deja valide (mot de passe OK) + le code a 6 chiffres.
export async function verifyTotp(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });

    const code = String(req.body?.code ?? '');
    if (!code) return res.status(400).json({ success: false, error: 'Code requis.' });

    const { data: user, error } = await supabase
      .from('users').select('totp_secret').eq('id', userId).single();

    if (error || !user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });

    if (!user.totp_secret) {
      // Pas de TOTP configure : on ne bloque pas (garde-fou).
      return res.json({ success: true, totp_required: false });
    }

    const valide = authenticator.verify({ token: code, secret: user.totp_secret });
    if (!valide) {
      return res.status(403).json({ success: false, error: 'Code incorrect.' });
    }

    return res.json({ success: true, totp_required: true });
  } catch (e: any) {
    console.error('[TOTP] verify :', e?.message ?? e);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
}

// --- 4) Statut : ce compte a-t-il le TOTP actif ? ------------------
// Route PUBLIQUE (pas de token) : le frontend doit savoir s'il faut
// demander un code AVANT d'ouvrir la session.
export async function statusTotp(req: AuthRequest, res: Response) {
  try {
    const email = String(req.body?.email ?? '');
    if (!email) return res.status(400).json({ success: false, error: 'Email requis.' });

    const { data: user } = await supabase
      .from('users').select('totp_secret').eq('email', email).single();

    // On ne revele jamais si le compte existe : juste s'il faut un code.
    return res.json({ success: true, totp_enabled: !!(user && user.totp_secret) });
  } catch {
    return res.json({ success: true, totp_enabled: false });
  }
}
