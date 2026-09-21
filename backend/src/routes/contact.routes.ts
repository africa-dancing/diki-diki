import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import nodemailer from 'nodemailer';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

export const contactRouter = Router();

const MAX = { nom: 100, email: 150, sujet: 100, message: 4000 };

const COLS = 'id, nom, email, sujet, message, email_envoye, created_at, supprime_le';

// GET /v1/contact — messages ACTIFS (non corbeille), admin uniquement.
contactRouter.get('/', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select(COLS)
      .is('supprime_le', null)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return res.json({ success: true, data: data ?? [] });
  } catch (e: any) {
    console.error('[CONTACT] lecture admin echouee:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_LIST_FAILED' });
  }
});

// GET /v1/contact/corbeille — messages dans la CORBEILLE (suppression douce).
contactRouter.get('/corbeille', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .select(COLS)
      .not('supprime_le', 'is', null)
      .order('supprime_le', { ascending: false })
      .limit(500);
    if (error) throw error;
    return res.json({ success: true, data: data ?? [] });
  } catch (e: any) {
    console.error('[CONTACT] lecture corbeille echouee:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_TRASH_FAILED' });
  }
});

// DELETE /v1/contact/:id — suppression DOUCE : le message part à la corbeille.
contactRouter.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ error: 'ID_REQUIS' });
    const { error } = await supabase
      .from('contact_messages')
      .update({ supprime_le: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    console.error('[CONTACT] mise en corbeille echouee:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_DELETE_FAILED' });
  }
});

// POST /v1/contact/:id/restore — RESTAURER un message depuis la corbeille.
contactRouter.post('/:id/restore', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ error: 'ID_REQUIS' });
    const { error } = await supabase
      .from('contact_messages')
      .update({ supprime_le: null })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    console.error('[CONTACT] restauration echouee:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_RESTORE_FAILED' });
  }
});

// DELETE /v1/contact/:id/definitif — suppression DÉFINITIVE (vider de la corbeille).
contactRouter.delete('/:id/definitif', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ error: 'ID_REQUIS' });
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) {
    console.error('[CONTACT] suppression definitive echouee:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_HARD_DELETE_FAILED' });
  }
});

contactRouter.post('/', async (req: Request, res: Response) => {
  try {
    const nom     = String(req.body?.nom     || '').trim();
    const email   = String(req.body?.email   || '').trim();
    const sujet   = String(req.body?.sujet   || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!nom || !email || !sujet || !message) return res.status(400).json({ error: 'CHAMPS_REQUIS' });
    if (nom.length > MAX.nom || email.length > MAX.email || sujet.length > MAX.sujet || message.length > MAX.message)
      return res.status(400).json({ error: 'CHAMP_TROP_LONG' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'EMAIL_INVALIDE' });

    // 1) Enregistrement en base — priorite absolue : ne jamais perdre un message
    const { data: msg, error: dbErr } = await supabase
      .from('contact_messages')
      .insert({ nom, email, sujet, message })
      .select()
      .single();
    if (dbErr) throw dbErr;

    // 2) Alerte e-mail (non bloquante : si le SMTP tombe, le message reste en base)
    res.status(201).json({ success: true }); /*DKDK_CONTACT_ASYNC*/
    try {
      /*DKDK_RESEND*/
      const envoyerEmail = async (payload: any) => {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          throw new Error('Resend ' + r.status + ' ' + (await r.text()));
        }
      };

      await envoyerEmail({
        from: `Diki-Diki Contact <support@diki-diki.com>`,
        to: [process.env.CONTACT_TO || 'support@diki-diki.com'],
        reply_to: email,
        subject: `[Contact] ${sujet} - ${nom}`,
        text: `Nom : ${nom}\nEmail : ${email}\nSujet : ${sujet}\n\n${message}`,
      });

      // Accuse de reception au visiteur /*DKDK_CONTACT_ACK*/
      await envoyerEmail({
        from: `Diki-Diki <support@diki-diki.com>`,
        to: [email],
        subject: 'Nous avons bien recu votre message - Diki-Diki',
        text: `Bonjour ${nom},\n\nNous avons bien recu votre message concernant "${sujet}".\nNotre equipe vous repondra sous 24h ouvrables.\n\nRappel de votre message :\n${message}\n\n--\nL'equipe Diki-Diki\nsupport@diki-diki.com`,
      });

      await supabase.from('contact_messages').update({ email_envoye: true }).eq('id', msg.id);
    } catch (e: any) {
      console.error('[CONTACT] envoi e-mail echoue (non bloquant):', e?.message ?? e);
    }

    return;
  } catch (e: any) {
    console.error('[CONTACT] erreur:', e?.message ?? e);
    return res.status(500).json({ error: 'CONTACT_FAILED' });
  }
});