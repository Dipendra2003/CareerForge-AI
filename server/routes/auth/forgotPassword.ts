import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { createPasswordResetToken } from '../../services/auth/tokenService';
import { sendTemplateEmail } from '../../services/email/emailService';
import { env } from '../../config/env';

const forgotSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { email } = forgotSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (user) {
      const { token: resetToken, otp } = await createPasswordResetToken(user.id);
      
      const resetLink = `${env.VITE_APP_URL}/reset-password?token=${resetToken}`;
      
      await sendTemplateEmail('forgot_password', email, {
        link: resetLink,
        resetLink: resetLink,
        name: user.name || 'User',
        otp: otp
      });
    }

    // Always return same success message
    res.json({ message: "If that email is registered, you will receive password reset instructions shortly." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
