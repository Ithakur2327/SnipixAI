import { Router } from "express";
import {
  chat,
  getChatHistory,
  clearChat,
} from "../controllers/rag.controller";
import { protect } from "../middleware/auth";
import { chatRules, validate } from "../middleware/validators";
import { asyncHandler } from "../utils/asynchandler";

const router = Router();

router.use(protect);

router.post  ("/:documentId/chat",    chatRules, validate, asyncHandler(chat));
router.get   ("/:documentId/history", asyncHandler(getChatHistory));
router.delete("/:documentId/chat",    asyncHandler(clearChat));

export default router;