import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => `${e.type}: ${e.msg}`).join("; ");
    return next(new AppError(msg, 422, "VALIDATION_ERROR"));
  }
  next();
};

export const registerRules = [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password ≥ 8 chars"),
];

export const loginRules = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

export const uploadUrlRules = [
  body("url").isURL({ require_protocol: true }).withMessage("Valid URL required"),
  body("outputType").optional().isIn(["tldr","bullets","key_insights","action_points","section_summary"]),
];

export const rawTextRules = [
  body("text").trim().isLength({ min: 50 }).withMessage("Text must be ≥ 50 chars"),
  body("title").optional().trim().isLength({ max: 255 }),
];

export const summaryRules = [
  param("documentId").isMongoId(),
  body("outputType").isIn(["tldr","bullets","key_insights","action_points","section_summary"]),
];

export const chatRules = [
  param("documentId").isMongoId(),
  body("question").trim().isLength({ min: 3, max: 1000 }),
];