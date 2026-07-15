import crypto from 'crypto';
import prisma from '../../lib/prisma';

// 30 days
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;
// 24 hours
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;
// 1 hour
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000;

export const generateOpaqueToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const createRefreshToken = async (userId: string) => {
  const { token, hashedToken } = generateOpaqueToken();
  
  await prisma.refreshToken.create({
    data: {
      userId,
      hashedToken, // field is hashedToken in DB
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
    },
  });

  return token; // Send this to user
};

export const createEmailVerificationToken = async (userId: string) => {
  const { token, hashedToken } = generateOpaqueToken();
  const otp = crypto.randomInt(100000, 999999).toString();
  
  await prisma.emailVerification.create({
    data: {
      userId,
      token: hashedToken, // DB field is token, we'll store hash here
      otp,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY),
    },
  });

  return { token, otp };
};

export const createPasswordResetToken = async (userId: string) => {
  const { token, hashedToken } = generateOpaqueToken();
  const otp = crypto.randomInt(100000, 999999).toString();
  
  await prisma.passwordReset.create({
    data: {
      userId,
      token: hashedToken, // DB field is token, we'll store hash here
      otp,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY),
    },
  });

  return { token, otp };
};
