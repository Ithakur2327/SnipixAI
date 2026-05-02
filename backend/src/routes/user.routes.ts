import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getUsage,
} from "../controllers/user.controller";
import { protect } from "../middleware/auth";
import { asyncHandler } from "../utils/asynchandler";

const router = Router();

router.use(protect);

router.get  ("/profile", asyncHandler(getProfile));
router.patch("/profile", asyncHandler(updateProfile));
router.get  ("/usage",   asyncHandler(getUsage));

export default router;