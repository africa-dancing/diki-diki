import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import nodemailer from 'nodemailer';

export const contactRouter = Router();

const MAX = { nom: 100, email: 150, sujet: 100, message: 4000 };

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
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT || 465),
        secure: true,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from:    `"Diki-Diki Contact" <${process.env.SMTP_USER}>`,
        to:      process.env.CONTACT_TO || process.env.SMTP_USER,
        replyTo: email,
        subject: `[Contact] ${sujet} - ${nom}`,
        text:    `Nom : ${nom}\nEmail : ${email}\nSujet : ${sujet}\n\n${message}`,
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