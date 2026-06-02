import { Request, Response } from 'express';
import * as ContestService from '../services/contest.service';

export async function getContests(req: Request, res: Response) {
  try {
    const { statut } = req.query;
    let data;
    if (statut === 'actif')       data = await ContestService.getActiveContests();
    else if (statut === 'ouvrir') data = await ContestService.getUpcomingContests();
    else                          data = await ContestService.getAllContests();
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// ── CRÉER ──
export async function createContest(req: Request, res: Response) {
  try {
    if (!req.body.title || !req.body.ends_at) {
      return res.status(400).json({ success: false, error: 'title et ends_at requis' });
    }
    const data = await ContestService.createContest(req.body);
    res.status(201).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// ── MODIFIER ──
export async function updateContest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await ContestService.updateContest(id, req.body);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// ── SUPPRIMER ──
export async function deleteContest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await ContestService.deleteContest(id);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}
