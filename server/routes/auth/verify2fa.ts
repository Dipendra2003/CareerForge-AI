
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { generateAccessToken } from '../../services/auth/jwt';
import { createRefreshToken } from '../../services/auth/tokenService';
import { logActivity } from '../../utils/auditLogger';
import { UAParser } from 'ua-parser-js';

const verifySchema = z.object({
  tempToken: z.string(),
  code: z.string(),
});

export const verify2FAHandler = async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = verifySchema.parse(req.body);
    let decoded: any;
    try {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch(e) {
      return res.status(401).json({ error: "Invalid or expired temporary token" });
    }
    
    if (!decoded.is2faAuth || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token structure" });
    }
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: "User not found" });
    
    const secSettings = await prisma.securitySetting.findUnique({ where: { userId: user.id } });
    if (!secSettings || !secSettings.twoFactorEnabled || !secSettings.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not enabled for this user" });
    }
    
    const verified = speakeasy.totp.verify({
      secret: secSettings.twoFactorSecret,
      encoding: 'hex',
      token: code
    });
    
    let isBackup = false;
    if (!verified) {
      // Check backup codes
      const backupCode = await prisma.backupCode.findFirst({
        where: { userId: user.id, code, used: false }
      });
      if (!backupCode) {
         return res.status(401).json({ error: "Invalid code" });
      }
      isBackup = true;
      await prisma.backupCode.update({
        where: { id: backupCode.id },
        data: { used: true, usedAt: new Date() }
      });
    }

    const loginTime = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: loginTime }
    });

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = new UAParser(req.headers['user-agent'] || '');
    const browser = ua.getBrowser().name ? ua.getBrowser().name + " " + ua.getBrowser().version : 'Unknown';
    const os = ua.getOS().name ? ua.getOS().name + " " + ua.getOS().version : 'Unknown';
    const device = ua.getDevice().vendor ? ua.getDevice().vendor + " " + ua.getDevice().model : 'Desktop';
    
    let policy = await prisma.passwordPolicy.findFirst();
    if (!policy) { policy = { refreshExpiryDays: 7 } as any; }

    const accessToken = generateAccessToken({ 
       userId: user.id, email: user.email, role: user.role, plan: user.plan || 'free' 
    });
    const refreshToken = await createRefreshToken(user.id);
    
    await prisma.userSession.create({
      data: {
        userId: user.id, refreshToken, ip, device, browser, os,
        createdAt: loginTime, lastActivity: loginTime,
        expiresAt: new Date(loginTime.getTime() + policy.refreshExpiryDays * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, ip, browser, os, device, loginTime, success: true }
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
      maxAge: policy.refreshExpiryDays * 24 * 60 * 60 * 1000
    });

    await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Login (2FA)', module: 'Auth' });

    res.json({ accessToken });
  } catch (error) {
    if (error && error.errors) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: "Internal server error" });
  }
};
