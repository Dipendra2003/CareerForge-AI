import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { hashToken, createRefreshToken } from '../../services/auth/tokenService';
import { generateAccessToken } from '../../services/auth/jwt';

export const refreshHandler = async (req: Request, res: Response) => {
  try {
    const refreshTokenStr = req.cookies?.refreshToken;
    if (!refreshTokenStr) {
      return res.status(401).json({ error: "No refresh token provided." });
    }

    const hashed = hashToken(refreshTokenStr);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { hashedToken: hashed },
      include: { 
        user: {
          include: { userQuotaOverride: true }
        }
      },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid or expired refresh token." });
    }

    if (tokenRecord.user.isSuspended) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    // Revoke old
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    // Issue new
    const accessToken = generateAccessToken({ 
      userId: tokenRecord.user.id, 
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      plan: tokenRecord.user.plan || 'free'
    });
    
    
    const newRefreshToken = await createRefreshToken(tokenRecord.user.id);

    // Update UserSession if it exists
    await prisma.userSession.updateMany({
      where: { refreshToken: refreshTokenStr, revoked: false },
      data: { refreshToken: newRefreshToken, lastActivity: new Date() }
    });


    res.cookie('refreshToken', newRefreshToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: 30 * 24 * 60 * 60 * 1000
    });

    let extraScans = 0;
    if (tokenRecord.user.userQuotaOverride) {
      if (!tokenRecord.user.userQuotaOverride.resetDate || new Date(tokenRecord.user.userQuotaOverride.resetDate) > new Date()) {
        extraScans = tokenRecord.user.userQuotaOverride.extraScans || 0;
      }
    }

    const safeUser = {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
      role: tokenRecord.user.role,
      plan: tokenRecord.user.plan || 'free',
      isEmailVerified: tokenRecord.user.isEmailVerified,
      createdAt: tokenRecord.user.createdAt,
      avatarUrl: tokenRecord.user.avatarUrl,
      googleId: tokenRecord.user.googleId,
      scans_used_this_month: tokenRecord.user.scansUsedThisMonth || 0,
      extra_scans: extraScans,
      quota_reset_date: tokenRecord.user.userQuotaOverride?.resetDate || null
    };

    res.json({ accessToken, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
