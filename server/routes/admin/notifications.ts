import { Router } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { NotificationService } from "../../services/notification/NotificationService";
import { readNotificationLimiter, broadcastLimiter, deleteLimiter } from "../../middleware/rateLimit";
import { NotificationScheduleStatus } from "../../types/notification";

const router = Router();
router.use(requireAuth, requireAdmin);

// Dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const totalSent = await prisma.notification.count();
    const scheduled = await prisma.notificationSchedule.count({ where: { status: "pending" } });
    const broadcasts = await prisma.notificationSchedule.count({ where: { audience: { not: "Single User" } } }); // Approximation
    res.json({ totalSent, scheduled, broadcasts });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// List notifications (all for admin viewing)
router.get("/", readNotificationLimiter, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || "20")));
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;
    const priority = req.query.priority as string | undefined;

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (priority) where.priority = priority;

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

    const [total, notificationsRaw] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany(queryOptions)
    ]);

    const nextCursor = notificationsRaw.length === limit ? notificationsRaw[notificationsRaw.length - 1].id : null;

    res.json({
      data: notificationsRaw,
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
    res.status(500).json({ error: "Server error" });
  }
});

// Broadcast/Send a notification
router.post("/broadcast", broadcastLimiter, async (req, res) => {
  try {
    const { title, message, type, category, priority, icon, actionUrl, actionText, audience, scheduledAt } = req.body;
    
    if (scheduledAt) {
      await NotificationService.schedule({
        title, message, type, category, priority, icon, actionUrl, actionText,
        audience: audience || "All Users",
        createdBy: req.user!.id,
        sendAt: new Date(scheduledAt)
      });
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          actorEmail: req.user!.email,
          module: "NOTIFICATIONS",
          action: "SCHEDULE_BROADCAST",
          description: `Scheduled notification for ${audience}`
        }
      });
      return res.json({ success: true, scheduled: true });
    }

    const count = await NotificationService.broadcast({
      title, message, type, category, priority, icon, actionUrl, actionText,
      audience: audience || "All Users",
      createdBy: req.user!.id
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        module: "NOTIFICATIONS",
        action: "SEND_BROADCAST",
        description: `Sent broadcast to ${count} users (${audience})`
      }
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// List Scheduled
router.get("/scheduled", async (req, res) => {
  try {
    const schedules = await prisma.notificationSchedule.findMany({
      orderBy: { sendAt: "asc" }
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Cancel Scheduled
router.delete("/scheduled/:id", async (req, res) => {
  try {
    await prisma.notificationSchedule.update({
      where: { id: req.params.id },
      data: { status: NotificationScheduleStatus.CANCELLED }
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        module: "NOTIFICATIONS",
        action: "CANCEL_SCHEDULE",
        description: `Cancelled scheduled notification ${req.params.id}`
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a notification
router.delete("/:id", deleteLimiter, async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
