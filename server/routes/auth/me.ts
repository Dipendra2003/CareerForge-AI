import { Request, Response } from 'express';
import { verifyAccessToken } from '../../services/auth/jwt';
import prisma from '../../lib/prisma';

export const meHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        isEmailVerified: true,
        createdAt: true,
        scansUsedThisMonth: true,
        userQuotaOverride: {
          select: {
            extraScans: true,
            resetDate: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Use the actual integer field which handles race conditions and doesn't refund on delete
    const scansUsedThisMonth = user.scansUsedThisMonth || 0;

    // Calculate extra scans from quota override if valid
    let extraScans = 0;
    if (user.userQuotaOverride) {
      if (!user.userQuotaOverride.resetDate || new Date(user.userQuotaOverride.resetDate) > new Date()) {
        extraScans = user.userQuotaOverride.extraScans || 0;
      }
    }

    res.json({ 
      user: {
        ...user,
        scans_used_this_month: scansUsedThisMonth,
        extra_scans: extraScans,
        quota_reset_date: user.userQuotaOverride?.resetDate || null
      }
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
