import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { hashToken, createRefreshToken } from '../../services/auth/tokenService';
import { generateAccessToken } from '../../services/auth/jwt';
import { sendTemplateEmail } from '../../services/email/emailService';
import { logActivity } from '../../utils/auditLogger';

export const verifyEmailHandler = async (req: Request, res: Response) => {
  try {
    const { token, email, otp } = req.body;
    let userId = null;

    if (token) {
      const hashed = hashToken(token);
      const record = await prisma.emailVerification.findUnique({
        where: { token: hashed },
      });

      if (!record || record.used || record.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invalid or expired verification token." });
      }
      userId = record.userId;
      
      await prisma.emailVerification.delete({
        where: { id: record.id }
      });
    } else if (email && otp) {
      const userObj = await prisma.user.findUnique({ where: { email } });
      if (!userObj) {
        return res.status(400).json({ error: "Invalid email or OTP." });
      }

      const record = await prisma.emailVerification.findFirst({
        where: { userId: userObj.id, otp, used: false, expiresAt: { gt: new Date() } }
      });

      if (!record) {
        return res.status(400).json({ error: "Invalid or expired OTP." });
      }
      userId = record.userId;

      await prisma.emailVerification.delete({
        where: { id: record.id }
      });
    } else {
      return res.status(400).json({ error: "Missing verification parameters." });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Email Verification', module: 'Auth' });

    await sendTemplateEmail('welcome', user.email, {
      name: user.name || 'User'
    }).catch(e => console.error("Could not send welcome email", e));

    const accessToken = generateAccessToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      plan: user.plan || 'free'
    });
    const refreshToken = await createRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ message: "Email verified successfully.", accessToken });
  } catch(error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

