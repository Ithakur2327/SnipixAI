import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const signToken = (userId: string): string => {
  const secret = env.JWT_SECRET as jwt.Secret;
  const options = { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions;
  return jwt.sign({ id: userId }, secret, options);
};

export const verifyToken = (token: string): { id: string } => {
  return jwt.verify(token, env.JWT_SECRET as jwt.Secret) as { id: string };
};