import { Router } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { logActivity } from "../../utils/auditLogger";
import { hashToken } from "../../services/auth/tokenService";

const router = Router();
router.use(requireAuth, requireAdmin);

// Dashboard stats
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date(new Date().setHours(0,0,0,0));
    const [
      activeSessions,
      failedLoginsToday,
      blockedIPs,
      twoFactorUsers,
      alerts,
      passwordResets
    ] = await Promise.all([
      prisma.userSession.count({ where: { revoked: false, expiresAt: { gt: new Date() } } }),
      prisma.failedLoginAttempt.count({ where: { timestamp: { gte: today } } }),
      prisma.blockedIP.count({ where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
      prisma.securitySetting.count({ where: { twoFactorEnabled: true } }),
      prisma.securityAlert.count({ where: { createdAt: { gte: today } } }),
      prisma.passwordReset.count({ where: { createdAt: { gte: today } } })
    ]);

    res.json({
      activeSessions,
      failedLoginsToday,
      blockedIPs,
      twoFactorUsers,
      alerts,
      passwordResets
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Login History
router.get("/logins", async (req, res) => {
  try {
    const history = await prisma.loginHistory.findMany({
      orderBy: { loginTime: 'desc' },
      take: 100
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Active Sessions
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      orderBy: { lastActivity: 'desc' },
      take: 100
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Revoke Session
router.post("/sessions/:id/revoke", async (req, res) => {
  try {
    const session = await prisma.userSession.update({
      where: { id: req.params.id },
      data: { revoked: true }
    });
    // Also revoke the refresh token in the RefreshToken table if needed
    if (session.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { hashedToken: hashToken(session.refreshToken) },
        data: { revoked: true }
      });
    }
    await logActivity({ req, action: 'Revoke Session', module: 'Security', description: `Revoked session ${req.params.id}` });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions/revoke-all/:userId", async (req, res) => {
  try {
    await prisma.userSession.updateMany({
      where: { userId: req.params.userId },
      data: { revoked: true }
    });
    await prisma.refreshToken.updateMany({
      where: { userId: req.params.userId },
      data: { revoked: true }
    });
    await logActivity({ req, action: 'Revoke All Sessions', module: 'Security', description: `Revoked all sessions for user ${req.params.userId}` });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Failed Logins
router.get("/failed-logins", async (req, res) => {
  try {
    const fails = await prisma.failedLoginAttempt.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(fails);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Security Alerts
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await prisma.securityAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Blocked IPs
router.get("/blocked-ips", async (req, res) => {
  try {
    const ips = await prisma.blockedIP.findMany({
      orderBy: { blockedAt: 'desc' }
    });
    res.json(ips);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/blocked-ips", async (req, res) => {
  try {
    const { ip, reason } = req.body;
    const blocked = await prisma.blockedIP.upsert({
      where: { ip },
      update: { reason, expiresAt: null },
      create: { ip, reason, expiresAt: null }
    });
    await logActivity({ req, action: 'Block IP', module: 'Security', description: `Blocked IP ${ip}` });
    res.json(blocked);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/blocked-ips/:id", async (req, res) => {
  try {
    await prisma.blockedIP.delete({ where: { id: req.params.id } });
    await logActivity({ req, action: 'Unblock IP', module: 'Security', description: `Unblocked IP ID ${req.params.id}` });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Trusted Devices
router.get("/trusted-devices", async (req, res) => {
  try {
    const devices = await prisma.trustedDevice.findMany({
      orderBy: { lastUsed: 'desc' },
      take: 100,
       
    });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/trusted-devices/:id", async (req, res) => {
  try {
    await prisma.trustedDevice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Password Policy
router.get("/password-policy", async (req, res) => {
  try {
    let policy = await prisma.passwordPolicy.findFirst();
    if (!policy) {
      policy = await prisma.passwordPolicy.create({ data: {} });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/password-policy", async (req, res) => {
  try {
    const policy = await prisma.passwordPolicy.findFirst();
    const updated = await prisma.passwordPolicy.update({
      where: { id: policy!.id },
      data: req.body
    });
    await logActivity({ req, action: 'Update Password Policy', module: 'Security', description: `Updated password policy` });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// API Keys
router.get("/api-keys", async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
       
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/api-keys/:id/toggle", async (req, res) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ error: "Key not found" });
    const updated = await prisma.apiKey.update({
      where: { id: key.id },
      data: { isActive: !key.isActive }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;