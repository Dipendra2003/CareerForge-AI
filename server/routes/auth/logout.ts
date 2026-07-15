import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { hashToken } from '../../services/auth/tokenService';
import { logActivity } from '../../utils/auditLogger';

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const refreshTokenStr = req.cookies?.refreshToken;

    if (refreshTokenStr) {
      const hashed = hashToken(refreshTokenStr);
      const tokenRecord = await prisma.refreshToken.findFirst({ where: { hashedToken: hashed } });
      await prisma.refreshToken.updateMany({
        where: { hashedToken: hashed },
        data: { revoked: true },
      });
      if (tokenRecord) {
        await logActivity({ req, actorId: tokenRecord.userId, action: 'Logout', module: 'Auth' });
      } else {
        await logActivity({ req, action: 'Logout', module: 'Auth', description: 'No token user found' });
      }
    } else {
      await logActivity({ req, action: 'Logout', module: 'Auth', description: 'No token provided' });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

