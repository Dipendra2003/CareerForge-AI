import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { NotificationService } from "../services/notification/NotificationService";
import { readNotificationLimiter, deleteLimiter } from "../middleware/rateLimit";

const router = Router();
router.use(requireAuth);

// Get User Notifications
router.get("/", readNotificationLimiter, async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || "20")));
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const isReadParam = req.query.isRead as string | undefined;
    const isArchivedParam = req.query.isArchived as string | undefined;

    const where: any = {
      OR: [
        { userId },
        { userId: null }
      ]
    };
    
    if (type) where.type = type;
    
    if (isReadParam === "false") {
      where.OR = [
        { userId, isRead: false },
        { userId: null, NOT: { readByIds: { has: userId } } }
      ];
    } else if (isReadParam === "true") {
       where.OR = [
        { userId, isRead: true },
        { userId: null, readByIds: { has: userId } }
      ];
    }

    if (isArchivedParam === "false") {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { userId, isArchived: false },
            { userId: null, NOT: { archivedByIds: { has: userId } } }
          ]
        }
      ];
    } else if (isArchivedParam === "true") {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { userId, isArchived: true },
            { userId: null, archivedByIds: { has: userId } }
          ]
        }
      ];
    }

    const unreadWhere = {
      OR: [
        { userId, isRead: false },
        { userId: null, NOT: { readByIds: { has: userId } } }
      ],
      AND: [
        {
          OR: [
            { userId, isArchived: false },
            { userId: null, NOT: { archivedByIds: { has: userId } } }
          ]
        }
      ]
    };

    const cursorParam = req.query.cursor as string | undefined;

    const queryOptions: any = {
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    };

    if (cursorParam) {
      queryOptions.cursor = { id: cursorParam };
      queryOptions.skip = 1;
    } else {
      queryOptions.skip = skip;
    }

    const [total, notificationsRaw, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany(queryOptions),
      prisma.notification.count({ where: unreadWhere })
    ]);

    const notifications = notificationsRaw.map(n => ({
      ...n,
      isRead: n.userId === null ? n.readByIds.includes(userId) : n.isRead,
      isArchived: n.userId === null ? n.archivedByIds.includes(userId) : n.isArchived
    }));

    const nextCursor = notificationsRaw.length === limit ? notificationsRaw[notificationsRaw.length - 1].id : null;

    res.json({
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit) || !!nextCursor,
        hasPrevious: page > 1,
        nextCursor
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark as read
router.put("/:id/read", readNotificationLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await NotificationService.markRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Mark all as read
router.put("/read-all", async (req, res) => {
  try {
    const userId = req.user!.id;
    await NotificationService.markAllRead(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Archive a notification
router.put("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await NotificationService.archive(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a notification (Archive for broadcasts)
router.delete("/:id", deleteLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await NotificationService.delete(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get user preferences
router.get("/preferences", async (req, res) => {
  try {
    const userId = req.user!.id;
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId } });
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update user preferences
router.put("/preferences", async (req, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (prefs) {
      prefs = await prisma.notificationPreference.update({
        where: { userId },
        data: {
          emailEnabled: data.emailEnabled,
          inAppEnabled: data.inAppEnabled,
          marketingEnabled: data.marketingEnabled,
          billingEnabled: data.billingEnabled,
          securityEnabled: data.securityEnabled,
          aiEnabled: data.aiEnabled,
          systemEnabled: data.systemEnabled,
          maintenanceEnabled: data.maintenanceEnabled,
        }
      });
    } else {
      prefs = await prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: data.emailEnabled,
          inAppEnabled: data.inAppEnabled,
          marketingEnabled: data.marketingEnabled,
          billingEnabled: data.billingEnabled,
          securityEnabled: data.securityEnabled,
          aiEnabled: data.aiEnabled,
          systemEnabled: data.systemEnabled,
          maintenanceEnabled: data.maintenanceEnabled,
        }
      });
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
