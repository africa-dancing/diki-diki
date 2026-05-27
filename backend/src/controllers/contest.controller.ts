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