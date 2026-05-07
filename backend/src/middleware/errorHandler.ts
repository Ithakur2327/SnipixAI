import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export class AppError extends Error {
  statusCode: number;
  code:       string;
  isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:       err.code,
        message:    err.message,
        statusCode: err.statusCode,
      },
    });
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: "DUPLICATE_KEY", message: "Already exists", statusCode: 409 },
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid token", statusCode: 401 },
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: { code: "TOKEN_EXPIRED", message: "Token expired", statusCode: 401 },
    });
  }

  if (err.name === "InsufficientQuotaError" || (err as any).statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: {
        code: (err as any).name || "OPENAI_QUOTA",
        message: err.message,
        statusCode: 429,
      },
    });
  }

  logger.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong", statusCode: 500 },
  });
};

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found", statusCode: 404 },
  });
};