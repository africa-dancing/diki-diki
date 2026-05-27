import { Router } from 'express';
import { getContests } from '../controllers/contest.controller';

const router = Router();

router.get('/', getContests);

export default router;