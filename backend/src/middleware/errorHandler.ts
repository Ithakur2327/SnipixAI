import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code = "APP_ERROR") {
    super(message);
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
  }
}

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, "NOT_FOUND"));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: AppError & Record<string, unknown>, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let code       = err.code       || "SERVER_ERROR";
  let message    = err.message    || "Internal server error";

  if (err.name === "ValidationError") {
    statusCode = 422; code = "VALIDATION_ERROR";
    message = Object.values(err.errors as Record<string, { message: string }>)
      .map((e) => e.message).join(", ");
  }
  if (err.code === "11000") {
    statusCode = 409; code = "DUPLICATE_KEY";
    const field = Object.keys(err.keyValue as object)[0];
    message = `${field} already exists`;
  }
  if (err.name === "JsonWebTokenError")  { statusCode = 401; code = "INVALID_TOKEN"; message = "Invalid token"; }
  if (err.name === "TokenExpiredError")  { statusCode = 401; code = "TOKEN_EXPIRED";  message = "Token expired"; }

  if (statusCode >= 500) logger.error(`[${code}] ${message}`, { stack: err.stack });

  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};