import { Response }         from "express";
import { User }             from "../models/User";
import { ok }               from "../utils/response";
import { AppError }         from "../middleware/errorHandler";
import { AuthRequest }      from "../types";

export const getProfile = async (req: AuthRequest, res: Response) => {
  ok(res, { user: (req.user as any).toPublicJSON() });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, avatarUrl } = req.body as { name?: string; avatarUrl?: string };

  const user = await User.findByIdAndUpdate(
    req.user!._id,
    { ...(name && { name }), ...(avatarUrl && { avatarUrl }) },
    { new: true }
  );
  if (!user) throw new AppError("User not found", 404);

  ok(res, { user: (user as any).toPublicJSON() });
};

export const getUsage = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!._id);
  if (!user) throw new AppError("User not found", 404);

  ok(res, {
    usageCount: user.usageCount,
    usageLimit: user.usageLimit,
    plan:       user.plan,
    remaining:  Math.max(0, user.usageLimit - user.usageCount),
  });
};