import rateLimit from "express-rate-limit";

const make = (windowMin: number, max: number, message: string) =>
  rateLimit({
    windowMs:        windowMin * 60 * 1000,
    max,
    message:         { success: false, error: { code: "RATE_LIMITED", message, statusCode: 429 } },
    standardHeaders: true,
    legacyHeaders:   false,
  });

export const globalLimiter = make(15, 200, "Too many requests.");
export const apiLimiter    = make(15, 200, "Too many requests.");   // alias used in server.ts
export const authLimiter   = make(15,  10, "Too many auth attempts. Try again in 15 min.");
export const uploadLimiter = make(60,  20, "Upload limit: 20/hour.");
export const aiLimiter     = make(60,  30, "AI limit: 30/hour.");