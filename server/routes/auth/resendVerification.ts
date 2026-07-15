import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { createEmailVerificationToken } from '../../services/auth/tokenService';
import { sendTemplateEmail } from '../../services/email/emailService';
import { env } from '../../config/env';

const resendSchema = z.object({
  email: z.string().email(),
});

export const resendVerificationHandler = async (req: Request, res: Response) => {
  try {
    const { email } = resendSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal user existence
      return res.status(200).json({ message: "If your email is registered, a verification link has been sent." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email is already verified." });
    }

    // Invalidate previous tokens
    await prisma.emailVerification.deleteMany({
      where: { userId: user.id }
    });

    const { token: verifyToken, otp } = await createEmailVerificationToken(user.id);
    
    const verificationLink = `${env.VITE_APP_URL}/verify-email?token=${verifyToken}`;
    await sendTemplateEmail('verification', email, {
      otp: otp,
      link: verificationLink,
      verificationLink: verificationLink,
      name: user.name || 'User'
    });

    res.status(200).json({ message: "If your email is registered, a verification link has been sent." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
