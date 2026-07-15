import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  plan: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn: '15m' });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return jwt.verify(token, secret) as JwtPayload;
};

export const generateRefreshToken = (payload: { userId: string }): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn: '30d' });
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.verify(token, secret) as { userId: string };
};
