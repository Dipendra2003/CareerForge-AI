import { Router } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import crypto from "crypto";
import speakeasy from "speakeasy";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const [
      loginHistory,
      activeSessions,
      trustedDevices,
      securitySettings,
      alerts
    ] = await Promise.all([
      prisma.loginHistory.findMany({ where: { userId }, orderBy: { loginTime: 'desc' }, take: 10 }),
      prisma.userSession.findMany({ where: { userId, revoked: false, expiresAt: { gt: new Date() } }, orderBy: { lastActivity: 'desc' } }),
      prisma.trustedDevice.findMany({ where: { userId } }),
      prisma.securitySetting.findUnique({ where: { userId } }),
      prisma.securityAlert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    let settings = securitySettings;
    if (!settings) {
      settings = await prisma.securitySetting.create({ data: { userId } });
    }

    res.json({
      loginHistory,
      activeSessions,
      trustedDevices,
      securitySettings: settings,
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions/:id/revoke", async (req: AuthRequest, res) => {
  try {
    const session = await prisma.userSession.findUnique({ where: { id: req.params.id } });
    if (!session || session.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    await prisma.userSession.update({
      where: { id: req.params.id },
      data: { revoked: true }
    });
    if (session.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { hashedToken: session.refreshToken },
        data: { revoked: true }
      });
    }
    
    await prisma.auditLog.create({
      data: { actorId: req.user.id, actorEmail: req.user.email, module: "Security", action: "Revoke Session", description: `Revoked session ${req.params.id}` }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions/revoke-all", async (req: AuthRequest, res) => {
  try {
    // Revoke all EXCEPT current? The prompt says "Logout Other Devices" and "Logout All Devices".
    // Let's do all. Or pass ?exceptCurrent=true
    const currentRefreshToken = req.cookies?.refreshToken;

    if (req.query.exceptCurrent && currentRefreshToken) {
      await prisma.userSession.updateMany({
        where: { userId: req.user.id, refreshToken: { not: currentRefreshToken } },
        data: { revoked: true }
      });
      await prisma.refreshToken.updateMany({
        where: { userId: req.user.id, hashedToken: { not: currentRefreshToken } },
        data: { revoked: true }
      });
    } else {
      await prisma.userSession.updateMany({
        where: { userId: req.user.id },
        data: { revoked: true }
      });
      await prisma.refreshToken.updateMany({
        where: { userId: req.user.id },
        data: { revoked: true }
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/trusted-devices/:id", async (req: AuthRequest, res) => {
  try {
    const device = await prisma.trustedDevice.findUnique({ where: { id: req.params.id } });
    if (!device || device.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    await prisma.trustedDevice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// 2FA Methods
router.post("/2fa/enable", async (req: AuthRequest, res) => {
  try {
    // Generate TOTP secret and backup codes
    const secret = speakeasy.generateSecret().hex;
    const codes = Array.from({ length: 10 }).map(() => crypto.randomBytes(4).toString('hex'));

    await prisma.securitySetting.upsert({
      where: { userId: req.user.id },
      update: { twoFactorEnabled: true, twoFactorSecret: secret },
      create: { userId: req.user.id, twoFactorEnabled: true, twoFactorSecret: secret }
    });

    // Delete existing backup codes and create new ones
    await prisma.backupCode.deleteMany({ where: { userId: req.user.id } });
    await prisma.backupCode.createMany({
      data: codes.map(c => ({ userId: req.user.id, code: c }))
    });

    await prisma.auditLog.create({
      data: { actorId: req.user.id, actorEmail: req.user.email, module: "Security", action: "Enable 2FA", description: `Enabled 2FA` }
    });

    const { sendTemplateEmail } = await import('../../services/email/emailService');
    await sendTemplateEmail('2fa_enabled', req.user.email, { name: req.user.name || 'User' });

    res.json({ secret, backupCodes: codes });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/2fa/disable", async (req: AuthRequest, res) => {
  try {
    await prisma.securitySetting.update({
      where: { userId: req.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });
    await prisma.backupCode.deleteMany({ where: { userId: req.user.id } });

    await prisma.auditLog.create({
      data: { actorId: req.user.id, actorEmail: req.user.email, module: "Security", action: "Disable 2FA", description: `Disabled 2FA` }
    });

    const { sendTemplateEmail } = await import('../../services/email/emailService');
    await sendTemplateEmail('2fa_disabled', req.user.email, { name: req.user.name || 'User' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/backup-codes/regenerate", async (req: AuthRequest, res) => {
  try {
    const codes = Array.from({ length: 10 }).map(() => crypto.randomBytes(4).toString('hex'));
    await prisma.backupCode.deleteMany({ where: { userId: req.user.id } });
    await prisma.backupCode.createMany({
      data: codes.map(c => ({ userId: req.user.id, code: c }))
    });
    res.json({ backupCodes: codes });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/settings", async (req: AuthRequest, res) => {
  try {
    const { loginEmailAlerts, newDeviceAlerts } = req.body;
    const settings = await prisma.securitySetting.upsert({
      where: { userId: req.user.id },
      update: { loginEmailAlerts, newDeviceAlerts },
      create: { userId: req.user.id, loginEmailAlerts, newDeviceAlerts }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;