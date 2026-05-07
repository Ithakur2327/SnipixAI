import { Request, Response } from "express";
import { User }        from "../models/User";
import { signToken }   from "../utils/jwt";
import { ok }          from "../utils/response";
import { AppError }    from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { asyncHandler } from "../utils/asynchandler";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already in use", 409);

  const user = await User.create({ name, email, passwordHash: password });
  const token = signToken(user._id.toString());

  ok(res, { user: (user as any).toPublicJSON(), token }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // passwordHash has no select:false so no need for +passwordHash
  const user = await User.findOne({ email });
  if (!user) throw new AppError("Invalid credentials", 401);

  if (!user.isActive) throw new AppError("Account deactivated", 403);

  const valid = await (user as any).comparePassword(password);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = signToken(user._id.toString());
  ok(res, { user: (user as any).toPublicJSON(), token });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  ok(res, { user: (req.user as any).toPublicJSON() });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, { message: "Logged out successfully" });
});