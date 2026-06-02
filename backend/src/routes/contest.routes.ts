import { Router } from "express";
import {
  getContests,
  createContest,
  updateContest,
  deleteContest,
} from "../controllers/contest.controller";

const router = Router();

router.get("/", getContests);
router.post("/", createContest);
router.patch("/:id", updateContest);
router.delete("/:id", deleteContest);

export default router;
