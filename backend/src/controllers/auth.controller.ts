import { Request, Response } from "express";
import { User }              from "../models/User";
import { signToken }         from "../utils/jwt";
import { ok }                from "../utils/response";
import { AppError }          from "../middleware/errorHandler";
import { AuthRequest }       from "../types";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already in use", 409, "EMAIL_EXISTS");

  const user = await User.create({ name, email, passwordHash: password });
  const token = signToken(user._id.toString());

  ok(res, {
    user:  (user as any).toPublicJSON(),
    token,
  }, 201);
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  if (!user.isActive) throw new AppError("Account deactivated", 403, "ACCOUNT_INACTIVE");

  const valid = await (user as any).comparePassword(password);
  if (!valid) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");

  const token = signToken(user._id.toString());

  ok(res, {
    user:  (user as any).toPublicJSON(),
    token,
  });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  ok(res, { user: (req.user as any).toPublicJSON() });
};

export const logout = (_req: Request, res: Response) => {
  ok(res, { message: "Logged out successfully" });
};