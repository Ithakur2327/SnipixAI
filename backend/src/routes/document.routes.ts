import { Router } from "express";
import {
  uploadFile,
  submitUrl,
  submitText,
  listDocuments,
  getDocument,
  getDocumentStatus,
  deleteDocument,
} from "../controllers/document.controller";
import { protect, checkQuota } from "../middleware/auth";
import { uploadUrlRules, rawTextRules, validate } from "../middleware/validators";
import { upload } from "../config/cloudinary";
import { asyncHandler } from "../utils/asynchandler";

const router = Router();

router.use(protect);

router.post("/upload", checkQuota, upload.single("file"), asyncHandler(uploadFile));
router.post("/url",    checkQuota, uploadUrlRules, validate, asyncHandler(submitUrl));
router.post("/text",   checkQuota, rawTextRules,   validate, asyncHandler(submitText));

router.get("/",          asyncHandler(listDocuments));
router.get("/:id",       asyncHandler(getDocument));
router.get("/:id/status",asyncHandler(getDocumentStatus));
router.delete("/:id",    asyncHandler(deleteDocument));

export default router;