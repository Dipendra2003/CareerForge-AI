import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { hashPassword } from '../../services/auth/password';
import { createEmailVerificationToken } from '../../services/auth/tokenService';
import { sendTemplateEmail } from '../../services/email/emailService';
import { NotificationService } from "../../services/notification/NotificationService";
import { NotificationType } from "../../types/notification";
import { logActivity } from '../../utils/auditLogger';
import { env } from '../../config/env';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const registerHandler = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findFirst();
    if (settings && !settings.allowSignup) {
      return res.status(403).json({ error: "Signups are currently disabled." });
    }

    const { email, password, name } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        isEmailVerified: false,
      },
    });

    const { token: verifyToken, otp } = await createEmailVerificationToken(user.id);
    
    const verificationLink = `${env.VITE_APP_URL}/verify-email?token=${verifyToken}`;
    await sendTemplateEmail('verification', email, {
      otp: otp,
      link: verificationLink,
      verificationLink: verificationLink,
      name: name || 'User'
    });

    await NotificationService.sendAuthentication(
      user.id,
      "Welcome to CareerForge AI",
      "Your account has been created successfully. Please verify your email.",
      NotificationType.SUCCESS
    );

    await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'User Registration', module: 'Auth' });
    res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
