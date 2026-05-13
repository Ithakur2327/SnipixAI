import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AppError } from "./errorHandler";
import { AuthRequest } from "../types";
import { env } from "../config/env";

export const protect = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError("Authentication required", 401, "NO_TOKEN"));

  try {
    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    const user    = await User.findById(decoded.id).select("+passwordHash");
    if (!user || !user.isActive) return next(new AppError("User not found", 401, "USER_NOT_FOUND"));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const checkQuota = (_req: AuthRequest, _res: Response, next: NextFunction) => {
  // Quota is unlimited — all authenticated users can upload freely
  next();
};