// src/controllers/ticker.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

interface AuthRequest extends Request {
  user?: { userId: string; role?: string };
}

// ─── GET /v1/ticker — Messages ticker publics ─────────────────────────────────
export const getTicker = async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('ticker_messages')
    .select('id, message, is_active, created_at')
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur récupération ticker.' });
  }

  return res.status(200).json({ success: true, data: data ?? [] });
};

// ─── POST /v1/ticker — Ajouter un message (admin) ────────────────────────────
export const addTicker = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, error: 'Message requis.' });
  }

  const { data, error } = await supabase
    .from('ticker_messages')
    .insert({ message: message.trim(), is_active: true })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur création ticker.' });
  }

  return res.status(201).json({ success: true, data });
};

// ─── DELETE /v1/ticker/:id — Supprimer un message (admin) ────────────────────
export const updateTicker = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { message, position } = req.body;

  const patch: any = {};
  if (typeof message === 'string' && message.trim()) patch.message = message.trim();
  if (typeof position === 'number') patch.position = position;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ success: false, error: 'Rien a modifier.' });
  }

  const { data, error } = await supabase
    .from('ticker_messages')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur modification ticker.' });
  }

  return res.status(200).json({ success: true, data });
};

export const removeTicker = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('ticker_messages')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur suppression ticker.' });
  }

  return res.status(200).json({ success: true, message: 'Message supprimé.' });
};