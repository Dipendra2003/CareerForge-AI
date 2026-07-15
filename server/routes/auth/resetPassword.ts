import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { hashToken } from '../../services/auth/tokenService';
import { hashPassword } from '../../services/auth/password';
import { sendTemplateEmail } from '../../services/email/emailService';
import { logActivity } from '../../utils/auditLogger';

const resetSchema = z.object({
  token: z.string().optional(),
  otp: z.string().optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(8),
}).refine(data => data.token || (data.otp && data.email), {
  message: "Either token or both otp and email must be provided",
  path: ["token"]
});

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { token, otp, email, newPassword } = resetSchema.parse(req.body);
    let record;

    if (token) {
      const hashed = hashToken(token);
      record = await prisma.passwordReset.findUnique({
        where: { token: hashed },
        include: { user: true },
      });
    } else if (otp && email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        record = await prisma.passwordReset.findFirst({
          where: {
            userId: user.id,
            otp: otp,
            used: false,
            expiresAt: { gt: new Date() }
          },
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset token or OTP." });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
         where: { id: record.userId },
         data: { passwordHash: hashedPassword },
      }),
      prisma.passwordReset.update({
         where: { id: record.id },
         data: { used: true },
      }),
      // Invalidate all refresh tokens
      prisma.refreshToken.updateMany({
         where: { userId: record.userId, revoked: false },
         data: { revoked: true },
      })
    ]);

    await logActivity({ req, actorId: record.user.id, actorEmail: record.user.email, action: 'Password Reset', module: 'Auth' });

    await sendTemplateEmail('password_changed', record.user.email, {
      name: record.user.name || 'User',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@careerforgeai.com'
    });

    res.json({ message: "Password reset successful. You may now log in." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

