import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e: any) => e.msg).join("; ");
    return next(new AppError(msg, 422, "VALIDATION_ERROR"));
  }
  next();
};

export const registerRules = [
  body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 chars"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 chars"),
];

export const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

export const uploadUrlRules = [
  body("url").isURL({ require_protocol: true }).withMessage("Valid URL required"),
  body("outputType").optional().isIn([
    "tldr","bullets","key_insights","action_points","section_summary",
  ]),
];

// min 1 char — chhota text bhi kaam kare
export const rawTextRules = [
  body("text").trim().isLength({ min: 1 }).withMessage("Text required"),
  body("title").optional().trim().isLength({ max: 255 }),
];

export const summaryRules = [
  param("documentId").isMongoId().withMessage("Valid document ID required"),
  body("outputType").isIn([
    "tldr","bullets","key_insights","action_points","section_summary",
  ]).withMessage("Valid output type required"),
];

export const chatRules = [
  param("documentId").isMongoId().withMessage("Valid document ID required"),
  body("question").trim().isLength({ min: 1, max: 1000 }).withMessage("Question required"),
];