import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { verifyPassword } from '../../services/auth/password';
import { createRefreshToken } from '../../services/auth/tokenService';
import { generateAccessToken } from '../../services/auth/jwt';
import { logActivity } from '../../utils/auditLogger';
import { UAParser } from 'ua-parser-js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginHandler = async (req: Request, res: Response) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const ua = new UAParser(req.headers['user-agent'] || '');
  const browser = ua.getBrowser().name + " " + ua.getBrowser().version;
  const os = ua.getOS().name + " " + ua.getOS().version;
  const device = ua.getDevice().vendor ? ua.getDevice().vendor + " " + ua.getDevice().model : 'Desktop';
  const loginTime = new Date();

  try {
    // 1. Check if IP is blocked
    const blocked = await prisma.blockedIP.findUnique({ where: { ip } });
    if (blocked && (!blocked.expiresAt || blocked.expiresAt > loginTime)) {
      return res.status(403).json({ error: "Your IP is temporarily blocked due to multiple failed login attempts." });
    }

    const settings = await prisma.systemSetting.findFirst();
    if (settings && settings.allowEmailLogin === false) {
      return res.status(403).json({ error: "Email login is currently disabled." });
    }

    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Determine failed attempt reason
    let failureReason: string | null = null;
    let authFailed = false;

    if (!user || !user.passwordHash) {
      failureReason = "Invalid email";
      authFailed = true;
    } else {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        failureReason = "Invalid password";
        authFailed = true;
      } else if (user.isSuspended) {
        failureReason = "Account suspended";
        authFailed = true;
      } else if (!user.isEmailVerified) {
        failureReason = "Email not verified";
        authFailed = true;
      }
    }

    // 2. Fetch Password Policy
    let policy = await prisma.passwordPolicy.findFirst();
    if (!policy) {
      policy = await prisma.passwordPolicy.create({ data: {} });
    }

    if (authFailed) {
      // Record Failed Login Attempt
      await prisma.failedLoginAttempt.create({
        data: {
          email,
          ip,
          browser,
          reason: failureReason,
          timestamp: loginTime
        }
      });

      // Log to LoginHistory if user is known
      if (user) {
         await prisma.loginHistory.create({
           data: {
             userId: user.id,
             ip,
             browser,
             os,
             device,
             loginTime,
             success: false,
             failureReason
           }
         });
      }

      // Check max failed attempts from IP or Email
      const recentFails = await prisma.failedLoginAttempt.count({
        where: {
          ip,
          timestamp: { gte: new Date(loginTime.getTime() - policy.lockDurationMinutes * 60000) }
        }
      });

      if (recentFails >= policy.maxFailedAttempts) {
        await prisma.blockedIP.upsert({
          where: { ip },
          update: { expiresAt: new Date(loginTime.getTime() + policy.lockDurationMinutes * 60000) },
          create: { 
            ip, 
            reason: "Max failed login attempts exceeded",
            expiresAt: new Date(loginTime.getTime() + policy.lockDurationMinutes * 60000)
          }
        });
      }

      await logActivity({ req, actorId: user?.id, actorEmail: email, action: 'Failed Login', module: 'Auth', description: failureReason || 'Unknown', status: 'Failed' });
      
      let errorMsg = "Invalid email or password.";
      if (failureReason === "Account suspended") errorMsg = "Your account has been suspended. Please contact support.";
      if (failureReason === "Email not verified") errorMsg = "Please verify your email before logging in.";

      return res.status(401).json({ error: errorMsg });
    }

    // Auth Succeeded!

    // Ensure user object is not null for TS
    if (!user) return res.status(500).json({ error: "Server error" });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: loginTime }
    });

    const accessToken = generateAccessToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      plan: user.plan || 'free'
    });
    
    // Modified to pass user IP and UA into createRefreshToken or we just create UserSession here
    const refreshToken = await createRefreshToken(user.id);
    
    // Create UserSession
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken, // We store the plain token or a hash? We'll store plain here to match it during revocation if needed, but the refreshToken table stores hash.
        ip,
        device,
        browser,
        os,
        createdAt: loginTime,
        lastActivity: loginTime,
        expiresAt: new Date(loginTime.getTime() + policy.refreshExpiryDays * 24 * 60 * 60 * 1000)
      }
    });

    // Create LoginHistory
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        browser,
        os,
        device,
        loginTime,
        success: true
      }
    });


    const secSettings = await prisma.securitySetting.findUnique({ where: { userId: user.id } });
    if (secSettings?.twoFactorEnabled) {
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
      const jwt = (await import('jsonwebtoken')).default || await import('jsonwebtoken');
      const tempToken = jwt.sign({ userId: user.id, is2faAuth: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requires2FA: true, tempToken });
    }

    // Set refresh token in HttpOnly cookie

    if (secSettings?.newDeviceAlerts) {
      // Very basic check if device was used before. In reality, requires checking TrustedDevice or past logins.
      const pastLogins = await prisma.loginHistory.count({
        where: { userId: user.id, device, success: true, loginTime: { lt: loginTime } }
      });
      if (pastLogins === 0) {
        await prisma.securityAlert.create({
          data: {
            userId: user.id,
            type: "New Device Login",
            severity: "Info",
            message: `New login from ${device} on ${browser} (${ip})`,
            ip,
            device
          }
        });
        // We'd send an email here using sendTemplateEmail
        const { sendTemplateEmail } = await import('../../services/email/emailService');
        await sendTemplateEmail('new_device_login', user.email, {
          name: user.name || 'User',
          device,
          ip,
          time: loginTime.toLocaleString()
        });
      }
    }

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: policy.refreshExpiryDays * 24 * 60 * 60 * 1000
    });

    await logActivity({ req, actorId: user.id, actorEmail: user.email, actorName: user.name || '', action: 'Login', module: 'Auth' });

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

