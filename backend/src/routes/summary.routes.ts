import { Router } from "express";
import {
  createSummary,
  listSummaries,
  deleteSummary,
} from "../controllers/summary.controller";
import { protect } from "../middleware/auth";
import { summaryRules, validate } from "../middleware/validators";
import { asyncHandler } from "../utils/asynchandler";

const router = Router();

router.use(protect);

router.post  ("/:documentId",     summaryRules, validate, asyncHandler(createSummary));
router.get   ("/:documentId",     asyncHandler(listSummaries));
router.delete("/:documentId/:id", asyncHandler(deleteSummary));

export default router;