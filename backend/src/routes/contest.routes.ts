import { Router } from "express";
import {
  getContests,
  createContest,
  updateContest,
  deleteContest,
} from "../controllers/contest.controller";

import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
const router = Router();

router.get("/", getContests);
router.post("/", requireAuth, requireAdmin, createContest); /*DKDK_CONTESTS_ADMIN*/
router.patch("/:id", requireAuth, requireAdmin, updateContest);
router.delete("/:id", requireAuth, requireAdmin, deleteContest);

export default router;
