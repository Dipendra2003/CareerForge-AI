import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import prisma from '../lib/prisma';
import plansRouter from './admin/plans';
import featuresRouter from './admin/features';
import settingsRouter from './admin/settings';
import aiRouter from './admin/ai';
import emailsRouter from './admin/emails';
import analyticsRouter from './admin/analytics';
import auditRouter from './admin/audit';
import faqsRouter from './admin/faqs';
import adminContactRouter from './admin/contact';
import landingRouter from './admin/landing';
import seoRouter from './admin/seo';
import notificationsRouter from './admin/notifications';
import billingRouter from './admin/billing';
import securityRouter from './admin/security';
import { logAdminAction } from '../utils/auditLogger';

const adminRouter = Router();

// Apply middleware to all routes in this router
adminRouter.use(requireAuth, requireAdmin);

adminRouter.use('/plans', plansRouter);
adminRouter.use('/features', featuresRouter);
adminRouter.use('/settings', settingsRouter);
adminRouter.use('/ai', aiRouter);
adminRouter.use('/emails', emailsRouter);
adminRouter.use('/analytics', analyticsRouter);
adminRouter.use('/audit', auditRouter);
adminRouter.use('/faqs', faqsRouter);
adminRouter.use('/contact', adminContactRouter);
adminRouter.use('/landing', landingRouter);
adminRouter.use('/seo', seoRouter);
adminRouter.use('/notifications', notificationsRouter);
adminRouter.use('/billing', billingRouter);
adminRouter.use('/security', securityRouter);

// GET /api/admin/dashboard
adminRouter.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const [
      totalUsers,
      freeUsers,
      proUsers,
      adminUsers,
      totalScans,
      recentSignups,
      latestScans,
      recentSuspensions,
      suspendedUsersCount,
      todayScans,
      monthScans,
      todaySignups,
      monthSignups
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { OR: [{ plan: 'free' }, { plan: 'Free' }, { plan: '' }] } }),
      prisma.user.count({ where: { NOT: { OR: [{ plan: 'free' }, { plan: 'Free' }, { plan: '' }] } } }),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.scan.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true, plan: true }
      }),
      prisma.scan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, jobTitle: true, atsScore: true, createdAt: true, user: { select: { email: true } } }
      }),
      prisma.user.findMany({
        where: { isSuspended: true },
        take: 5,
        orderBy: { suspendedAt: 'desc' },
        select: { id: true, name: true, email: true, suspendedAt: true, suspensionReason: true }
      }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.scan.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.scan.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      })
    ]);

    const actualFreeUsers = freeUsers;
    const actualProUsers = proUsers;

    res.json({
      stats: {
        totalUsers,
        freeUsers: actualFreeUsers,
        proUsers: actualProUsers,
        adminUsers,
        totalScans,
        activeUsers: totalUsers - suspendedUsersCount,
        suspendedUsers: suspendedUsersCount,
        todaySignups,
        monthSignups,
        todayScans,
        monthScans
      },
      recentSignups,
      latestScans,
      recentSuspensions
    });
  } catch (error) {
    console.error('Admin Fetch Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/admin/users
adminRouter.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, plan, isEmailVerified, isSuspended, sort = "newest" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { name: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (role && role !== 'all') where.role = String(role);
    if (plan && plan !== 'all') {
      if (plan === 'free') {
        where.OR = [{ plan: 'Free' }, { plan: 'free' }, { plan: null }];
      } else {
        where.plan = { equals: String(plan), mode: 'insensitive' };
      }
    }
    if (isEmailVerified && isEmailVerified !== 'all') where.isEmailVerified = isEmailVerified === 'true';
    if (isSuspended && isSuspended !== 'all') where.isSuspended = isSuspended === 'true';

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'alphabetical') orderBy = { name: 'asc' };
    if (sort === 'mostScans') orderBy = { scans: { _count: 'desc' } };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          isEmailVerified: true,
          isSuspended: true,
          createdAt: true,
          _count: {
            select: { scans: true }
          }
        },
        orderBy,
        skip,
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('Admin Fetch Users Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const user: any = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        isEmailVerified: true,
        isSuspended: true,
        suspensionReason: true,
        suspendedAt: true,
        lastLoginAt: true,
        createdAt: true,
        scansUsedThisMonth: true,
        userFeatureOverrides: { include: { feature: true } },
        userQuotaOverride: true,
        _count: {
          select: { scans: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch related counts + system settings in parallel
    const [coverLetters, interviewPreps, cloudinaryResumes, systemSettings] = await Promise.all([
      prisma.coverLetter.count({ where: { scan: { userId: String(user.id) } } }),
      prisma.interviewPrep.count({ where: { scan: { userId: String(user.id) } } }),
      prisma.scan.count({ where: { userId: String(user.id), resumeFileUrl: { not: null } } }),
      prisma.systemSetting.findFirst()
    ]);

    // Compute quota summary for admin visibility
    const plan = String(user.plan || 'free').toLowerCase();
    const basePlanLimit = plan === 'free' 
      ? (systemSettings?.freeScanLimit ?? 3) 
      : (systemSettings?.proScanLimit ?? 999999);
    
    let extraScans = 0;
    if (user.userQuotaOverride) {
      if (!user.userQuotaOverride.resetDate || new Date(user.userQuotaOverride.resetDate) > new Date()) {
        extraScans = user.userQuotaOverride.extraScans || 0;
      }
    }
    const totalLimit = basePlanLimit + extraScans;
    const scansUsed = user.scansUsedThisMonth || 0;
    const scansRemaining = Math.max(0, totalLimit - scansUsed);

    res.json({
      user: {
        ...user,
        coverLetters,
        interviewPreps,
        cloudinaryResumes,
        quotaSummary: {
          basePlanLimit,
          extraScans,
          totalLimit,
          scansUsed,
          scansRemaining,
          isOverrideExpired: user.userQuotaOverride?.resetDate 
            ? new Date(user.userQuotaOverride.resetDate) <= new Date() 
            : false,
          overrideExpiresAt: user.userQuotaOverride?.resetDate || null
        }
      }
    });
  } catch (error) {
    console.error('Admin Fetch User Details Error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// PUT /api/admin/users/:id/role
adminRouter.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    
    // Prevent self-demotion
    if (req.params.id === (req as any).user.id && role !== 'admin') {
      return res.status(403).json({ error: "You cannot demote yourself." });
    }

    // Prevent removing last admin
    if (role === 'user') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(403).json({ error: "Cannot remove the last administrator." });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });
    
    await logAdminAction(req, 'Update User Role', req.params.id, null, role);
    
    res.json({ success: true, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PUT /api/admin/users/:id/plan
adminRouter.put('/users/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { plan, scansUsedThisMonth: 0 }
    });
    
    await logAdminAction(req, 'Update User Plan', req.params.id, null, plan);
    
    res.json({ success: true, plan: user.plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// PUT /api/admin/users/:id/suspend
adminRouter.put('/users/:id/suspend', async (req, res) => {
  try {
    const { isSuspended, suspensionReason } = req.body;
    
    if (req.params.id === (req as any).user.id) {
      return res.status(403).json({ error: "You cannot suspend yourself." });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { 
        isSuspended,
        suspensionReason: isSuspended ? (suspensionReason || 'No reason provided') : null,
        suspendedAt: isSuspended ? new Date() : null
      }
    });

    if (isSuspended) {
      // Revoke all refresh tokens to force immediate logout
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });
    }

    await logAdminAction(req, isSuspended ? 'Suspend User' : 'Unsuspend User', req.params.id, null, suspensionReason || null);

    res.json({ success: true, isSuspended: user.isSuspended });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update suspension status' });
  }
});

// POST /api/admin/users/:id/feature-override
adminRouter.post('/users/:id/feature-override', async (req, res) => {
  try {
    const { featureId, action, expiresAt } = req.body;
    const override = await (prisma as any).userFeatureOverride.upsert({
      where: { userId_featureId: { userId: req.params.id, featureId } },
      create: {
        userId: req.params.id,
        featureId,
        action,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      update: {
        action,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    await logAdminAction(req, 'Update Feature Override', req.params.id, null, `Feature: ${featureId}, Action: ${action}`);
    res.json({ success: true, override });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feature override' });
  }
});

// POST /api/admin/users/:id/quota-override
adminRouter.post('/users/:id/quota-override', async (req, res) => {
  try {
    const { extraScans, resetDate } = req.body;
    
    const parsedScans = parseInt(extraScans, 10);
    if (isNaN(parsedScans) || parsedScans < 0) {
        return res.status(400).json({ error: "extraScans must be a positive integer" });
    }

    const override = await (prisma as any).userQuotaOverride.upsert({
      where: { userId: req.params.id },
      create: {
        userId: req.params.id,
        extraScans: parsedScans,
        resetDate: resetDate ? new Date(resetDate) : null
      },
      update: {
        extraScans: parsedScans,
        resetDate: resetDate ? new Date(resetDate) : null
      }
    });
    await logAdminAction(req, 'Update Quota Override', req.params.id, null, `Extra Scans: ${extraScans}`);
    res.json({ success: true, override });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quota override' });
  }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === (req as any).user.id) {
      return res.status(403).json({ error: "You cannot delete your own account." });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (targetUser?.role === 'admin') {
       const adminCount = await prisma.user.count({ where: { role: 'admin' } });
       if (adminCount <= 1) {
         return res.status(403).json({ error: "Cannot delete the last administrator." });
       }
    }

    if (targetUser?.subscriptionId) {
       try {
           const { getStripe } = await import('./stripe');
           const stripe = getStripe();
           await stripe.subscriptions.cancel(targetUser.subscriptionId);
       } catch (e) {
           console.error('Failed to cancel Stripe subscription during user deletion:', e);
       }
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    });
    
    await logAdminAction(req, 'Delete User', req.params.id, JSON.stringify(targetUser), null);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// BULK ACTIONS
adminRouter.post('/users/bulk/suspend', async (req, res) => {
  try {
    const { userIds, isSuspended, suspensionReason } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: "No users selected" });
    
    // Prevent self-suspension
    const idsToSuspend = userIds.filter(id => id !== (req as any).user.id);
    
    await prisma.user.updateMany({
      where: { id: { in: idsToSuspend } },
      data: {
        isSuspended,
        suspensionReason: isSuspended ? (suspensionReason || 'Bulk action') : null,
        suspendedAt: isSuspended ? new Date() : null
      }
    });

    if (isSuspended) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: idsToSuspend } }
      });
    }
    
    await logAdminAction(req, isSuspended ? 'Bulk Suspend Users' : 'Bulk Unsuspend Users', null, null, `Count: ${idsToSuspend.length}`);

    res.json({ success: true, count: idsToSuspend.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bulk suspension' });
  }
});

adminRouter.post('/users/bulk/plan', async (req, res) => {
  try {
    const { userIds, plan } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: "No users selected" });

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { plan, scansUsedThisMonth: 0 }
    });

    await logAdminAction(req, 'Bulk Update Plan', null, null, `Plan: ${plan}, Count: ${userIds.length}`);

    res.json({ success: true, count: userIds.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bulk plan change' });
  }
});

adminRouter.post('/users/bulk/role', async (req, res) => {
  try {
    const { userIds, role } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: "No users selected" });
    if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });

    let idsToProcess = userIds;

    // Prevent self-demotion
    if (role === 'user') {
      idsToProcess = idsToProcess.filter(id => id !== (req as any).user.id);
      
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      const adminsBeingDemoted = await prisma.user.count({ where: { id: { in: idsToProcess }, role: 'admin' } });
      
      if (adminCount - adminsBeingDemoted < 1) {
        return res.status(403).json({ error: "Cannot remove all administrators." });
      }
    }

    await prisma.user.updateMany({
      where: { id: { in: idsToProcess } },
      data: { role }
    });
    
    await logAdminAction(req, 'Bulk Update Role', null, null, `Role: ${role}, Count: ${idsToProcess.length}`);

    res.json({ success: true, count: idsToProcess.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bulk role change' });
  }
});

adminRouter.post('/users/bulk/delete', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: "No users selected" });

    let idsToProcess = userIds.filter(id => id !== (req as any).user.id);
    
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    const adminsBeingDeleted = await prisma.user.count({ where: { id: { in: idsToProcess }, role: 'admin' } });
    
    if (adminCount - adminsBeingDeleted < 1) {
      return res.status(403).json({ error: "Cannot delete all administrators." });
    }

    const usersToDelete = await prisma.user.findMany({ where: { id: { in: idsToProcess }, subscriptionId: { not: null } } });
    if (usersToDelete.length > 0) {
       try {
           const { getStripe } = await import('./stripe');
           const stripe = getStripe();
           for (const u of usersToDelete) {
               if (u.subscriptionId) {
                   await stripe.subscriptions.cancel(u.subscriptionId).catch(() => {});
               }
           }
       } catch (e) {
           console.error('Failed to cancel Stripe subscriptions during bulk deletion:', e);
       }
    }

    await prisma.user.deleteMany({
      where: { id: { in: idsToProcess } }
    });

    await logAdminAction(req, 'Bulk Delete Users', null, null, `Count: ${idsToProcess.length}`);

    res.json({ success: true, count: idsToProcess.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process bulk deletion' });
  }
});

export default adminRouter;
